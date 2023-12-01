
async function main() {
  const rawData = JSON.parse(rawDataJSON)

  // Put raw data into the pre tag
  const pre = document.getElementById("raw-data")
  pre.innerHTML = JSON.stringify(rawData, undefined, 2)

  // Timestamps
  const times = []
  const totalMemory = []
  for (let i = 0; i < rawData.length; i++) {
    const anyPid = Object.keys(rawData[i]).filter(pid => pid !== 'total' && pid !== 'totalMB')[0]
    times.push(rawData[i][anyPid].timestamp)
    totalMemory.push(rawData[i].totalMB)
  }

  const zeroAdjustedTimes = times.map(t => t - times[0])

  // Totals chart
  datasetTotal = {
    label: "Total",
    data: totalMemory,
    borderWidth: 1,
    fill: 'origin'
  }

  const ctxTotal = document.getElementById('chart-total');
  new Chart(ctxTotal, {
    type: 'line',
    data: {
      labels: zeroAdjustedTimes,
      datasets: [datasetTotal]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'RSS (megabytes)'
          },
        },
        x: {
          title: {
            display: true,
            text: 'Time (milliseconds)'
          }
        }
      }
    },
  });

  // Totals sidebar
  document.getElementById('total-count').innerHTML = rawData.length
  document.getElementById('total-max').innerHTML = Math.max(...totalMemory).toFixed(3)
  document.getElementById('total-mean').innerHTML = (totalMemory.reduce((a, b) => a + b) / totalMemory.length).toFixed(3)
  document.getElementById('total-median').innerHTML = (totalMemory.sort((a, b) => a - b)[Math.floor(totalMemory.length / 2)]).toFixed(3)

  // Chart of individual processes
  const datasets = []
  const pids = new Set()
  for (let i = 0; i < rawData.length; i++) {
    const keys = Object.keys(rawData[i])
    for (let j = 0; j < keys.length; j++) {
      if (keys[j] !== 'total' && keys[j] !== 'totalMB') {
        pids.add(keys[j])
      }
    }
  }
  for (const pid of pids) {
    const data = []
    for (let i = 0; i < rawData.length; i++) {
      data.push((rawData[i][pid]?.memory ?? 0) / 1024 / 1024)
    }
    datasets.push({
      label: pid,
      data: data,
      borderWidth: 1,
      fill: 'origin'
    })
  }

  const ctx = document.getElementById('chart-indi');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: zeroAdjustedTimes,
      datasets: datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'RSS (megabytes)'
          },
          stacked: true
        },
        x: {
          title: {
            display: true,
            text: 'Time (milliseconds)'
          }
        }
      }
    },
  });

  // Add pid details 
  const container = document.getElementById('pid-details')

  const pidArgs = new Map(JSON.parse(pidArgsJSON))
  for (let [pid, rawArg] of pidArgs) {
    const data = rawData.map(d => d[pid]?.memory ?? -1).filter(d => d !== -1).map(d => d / 1024 / 1024)
    const dataPoints = data.length
    const max = Math.max(...data).toFixed(3)
    const mean = (data.reduce((a, b) => a + b) / data.length).toFixed(3)
    const median = data.sort((a, b) => a - b)[Math.floor(data.length / 2)].toFixed(3)
    const arg = atob(rawArg).trim() || '?'

    const row = document.createElement("div")
    row.className = 'flex flex-col'

    const pidDiv = document.createElement("div")
    pidDiv.appendChild(document.createTextNode(pid))
    pidDiv.className = 'font-bold'
    row.appendChild(pidDiv)

    const argDiv = document.createElement("div")
    argDiv.appendChild(document.createTextNode(`- Args: ${arg}`))
    argDiv.className = 'whitespace-nowrap'
    row.appendChild(argDiv)

    const dataPointsDiv = document.createElement("div")
    dataPointsDiv.appendChild(document.createTextNode(`- Data points: ${dataPoints}`))
    row.appendChild(dataPointsDiv)

    const maxDiv = document.createElement("div")
    maxDiv.appendChild(document.createTextNode(`- Max: ${max}`))
    row.appendChild(maxDiv)

    const meanDiv = document.createElement("div")
    meanDiv.appendChild(document.createTextNode(`- Mean: ${mean}`))
    row.appendChild(meanDiv)

    const medianDiv = document.createElement("div")
    medianDiv.appendChild(document.createTextNode(`- Median: ${median}`))
    row.appendChild(medianDiv)

    container.appendChild(row)
  }

}

main()
