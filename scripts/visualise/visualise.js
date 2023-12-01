
async function main(divisionCount = 16) {
  const rawData = JSON.parse(rawDataJSON)
  const rawArgs = JSON.parse(rawArgsJSON)

  // Put raw data into the pre tag
  const pre = document.getElementById("raw-data")
  pre.innerHTML = JSON.stringify(rawData, undefined, 2)

  // PID details
  const pidDetails = document.getElementById("pid-details")
  for (const [pid, rawArg] of Object.entries(rawArgs)) {
    const arg = atob(rawArg)

    const row = document.createElement("div")
    row.className = "flex flex-col gap-2"

    const pidEl = document.createElement("div")
    pidEl.className = "font-bold"
    pidEl.innerText = pid
    row.appendChild(pidEl)

    const argsEl = document.createElement("div")
    argsEl.innerText = ` - Args: ${arg}`
    argsEl.className = "whitespace-nowrap"
    row.appendChild(argsEl)

    const dataPoints = rawData[pid].length
    const dataPointsEl = document.createElement("div")
    dataPointsEl.innerText = ` - Data points: ${dataPoints}`
    dataPointsEl.className = "whitespace-nowrap"
    row.appendChild(dataPointsEl)

    const max = (Math.max(...rawData[pid].map(p => p.memory)) / 1024 / 1024).toFixed(3)
    const maxEl = document.createElement("div")
    maxEl.innerText = ` - Max: ${max} MB`
    maxEl.className = "whitespace-nowrap"
    row.appendChild(maxEl)

    const mean = (rawData[pid].reduce((acc, p) => acc + p.memory, 0) / rawData[pid].length / 1024 / 1024).toFixed(3)
    const meanEl = document.createElement("div")
    meanEl.innerText = ` - Mean: ${mean} MB`
    meanEl.className = "whitespace-nowrap"
    row.appendChild(meanEl)

    const sorted = rawData[pid].map(p => p.memory).sort()
    const median = (sorted[Math.floor(sorted.length / 2)] / 1024 / 1024).toFixed(3)
    const medianEl = document.createElement("div")
    medianEl.innerText = ` - Median: ${median} MB`
    medianEl.className = "whitespace-nowrap"
    row.appendChild(medianEl)

    const lifetime = (rawData[pid][rawData[pid].length - 1].timestamp - rawData[pid][0].timestamp) / 1000
    const lifetimeEl = document.createElement("div")
    lifetimeEl.innerText = ` - Lifetime: ${lifetime} seconds`
    lifetimeEl.className = "whitespace-nowrap"
    row.appendChild(lifetimeEl)

    pidDetails.appendChild(row)
  }

  // Stats
  const stats = document.getElementById("stats")

  const pidCount = Object.keys(rawData).length
  const pidCountEl = document.createElement("div")
  pidCountEl.innerText = `PID count: ${pidCount}`
  pidCountEl.className = "whitespace-nowrap"
  stats.appendChild(pidCountEl)

  // Individual chart

  const allTimestamps = new Set()
  for (const pid of Object.keys(rawData)) {
    for (const dataPoint of rawData[pid]) {
      allTimestamps.add(dataPoint.timestamp)
    }
  }
  const sortedTimestamps = Array.from(allTimestamps).sort()
  const zeroAdjustedTimes = sortedTimestamps.map(t => t - sortedTimestamps[0])

  const datasets = []
  for (const pid of Object.keys(rawData)) {
    const dataset = {
      label: pid,
      data: [],
      fill: true,
      tension: 0.4
    }
    for (const timestamp of sortedTimestamps) {
      const dataPoint = rawData[pid].find(p => p.timestamp === timestamp)
      if (dataPoint === undefined) {
        dataset.data.push(null)
      } else {
        dataset.data.push(dataPoint.memory / 1024 / 1024)
      }
    }
    datasets.push(dataset)
  }

  const ctxIndi = document.getElementById('chart-indi');
  new Chart(ctxIndi, {
    type: 'line',
    data: {
      labels: zeroAdjustedTimes,
      datasets: datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'right',
        },
      },
      spanGaps: true,
      scales: {
        y: {
          title: {
            display: true,
            text: 'RSS (megabytes)'
          },
          suggestedMin: 0,
        },
        x: {
          title: {
            display: true,
            text: 'Time (milliseconds)'
          },
        }
      }
    },
  });

  // Total chart
  const divisions = Math.floor((zeroAdjustedTimes[zeroAdjustedTimes.length - 1] / 1000) * divisionCount)

  const totalTimestamps = [0]
  const deltaTime = zeroAdjustedTimes[zeroAdjustedTimes.length - 1] / divisions
  for (let i = 1; i <= divisions; i++) {
    totalTimestamps.push(Math.round((totalTimestamps[i - 1] + deltaTime)))
  }
  const totalData = []
  for (let i = 1; i < totalTimestamps.length; i++) {
    const minT = totalTimestamps[i - 1] + sortedTimestamps[0]
    const maxT = totalTimestamps[i] + sortedTimestamps[0]
    let total = 0
    for (const pid of Object.keys(rawData)) {
      let max = 0
      for (const dataPoint of rawData[pid]) {
        if (dataPoint.timestamp >= minT && dataPoint.timestamp <= maxT) {
          max = Math.max(max, dataPoint.memory)
        }
      }
      total += max
    }
    totalData.push(total === 0 ? null : total / 1024 / 1024)
  }

  const ctxTotal = document.getElementById('chart-total');
  new Chart(ctxTotal, {
    type: 'line',
    data: {
      labels: totalTimestamps,
      datasets: [{
        label: 'Total',
        data: totalData,
        fill: true,
        tension: 0.4
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'right',
        },
      },
      spanGaps: true,
      scales: {
        y: {
          title: {
            display: true,
            text: 'RSS (megabytes)'
          },
          suggestedMin: 0,
        },
        x: {
          title: {
            display: true,
            text: 'Time (milliseconds)'
          },
        }
      }
    },
  });

  // Indi binned chart
  const indiBinnedData = new Map()
  for (const pid of Object.keys(rawData)) {
    indiBinnedData.set(pid, [])
  }
  for (let i = 1; i < totalTimestamps.length; i++) {
    const minT = totalTimestamps[i - 1] + sortedTimestamps[0]
    const maxT = totalTimestamps[i] + sortedTimestamps[0]
    for (const pid of Object.keys(rawData)) {
      let max = 0
      for (const dataPoint of rawData[pid]) { 
        if (dataPoint.timestamp >= minT && dataPoint.timestamp <= maxT) {
          max = Math.max(max, dataPoint.memory)
        }
      }
      indiBinnedData.get(pid).push(max === 0 ? null : max / 1024 / 1024)
    }
  }

  const indiBinnedDatasets = []
  for (const [pid, data] of indiBinnedData) {
    indiBinnedDatasets.push({
      label: pid,
      data: data,
      fill: true,
      tension: 0.4
    })
  }

  const ctxIndiBinned = document.getElementById('chart-indi-binned');
  new Chart(ctxIndiBinned, {
    type: 'line',
    data: {
      labels: totalTimestamps,
      datasets: indiBinnedDatasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'right',
        },
      },
      spanGaps: true,
      scales: {
        y: {
          title: {
            display: true,
            text: 'RSS (megabytes)'
          },
          suggestedMin: 0,
          stacked: true,
        },
        x: {
          title: {
            display: true,
            text: 'Time (milliseconds)'
          },
        }
      }
    },
  });

}

main()
