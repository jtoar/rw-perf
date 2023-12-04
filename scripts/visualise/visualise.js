
async function main() {
  const telemetryEnabled = JSON.parse(telemetryEnabledJSON)
  const sampledPeriod = JSON.parse(sampledPeriodJSON)
  const rootCommand = JSON.parse(rootCommandJSON).join(" ")
  const projectDir = JSON.parse(projectDirJSON)
  const pidCommands = Object.fromEntries(JSON.parse(pidCommandsJSON))
  const rawSamples = JSON.parse(rawSamplesJSON)

  // Transform pidCommands out of base64
  for (const [pid, rawArg] of Object.entries(pidCommands)) {
    pidCommands[pid] = atob(rawArg)
  }

  // Transform the raw samples into a more usable format
  const samples = {}
  for (const [rawPid, _] of Object.entries(pidCommands)) {
    const pid = parseInt(rawPid, 10)
    samples[pid] = []
    for (const rawSample of rawSamples) {
      for (const sample of rawSample) {
        if (!sample) {
          continue
        }
        if (sample.pid === pid) {
          samples[pid].push(sample)
          break
        }
      }
    }
  }

  // Compute data points on a grid of 2*sampledPeriod
  const gridTimestamps = []
  const timestamps = new Set()
  for (const pid of Object.keys(samples)) {
    for (const dataPoint of samples[pid]) {
      timestamps.add(dataPoint.timestamp)
    }
  }
  const sortedTimestamps = Array.from(timestamps).sort()
  const zeroAdjustedTimes = sortedTimestamps.map(t => t - sortedTimestamps[0])
  for (let i = 0; i < zeroAdjustedTimes[zeroAdjustedTimes.length - 1]; i += sampledPeriod * 2) {
    gridTimestamps.push(i)
  }

  const gridSamples = {}
  for (const pid of Object.keys(pidCommands)) {
    gridSamples[pid] = []
    for (let i = 1; i < gridTimestamps.length; i++) {
      const minT = gridTimestamps[i - 1] + sortedTimestamps[0]
      const maxT = gridTimestamps[i] + sortedTimestamps[0]
      const points = []
      for (const dataPoint of samples[pid]) {
        if (dataPoint.timestamp >= minT && dataPoint.timestamp <= maxT) {
          points.push(dataPoint.memory)
        }
      }
      gridSamples[pid].push(points)
    }
  }

  // Compute the combined max, mean memory usage for each grid point
  const gridCombined = []
  for (let i = 0; i < gridTimestamps.length - 1; i++) {
    const values = []
    for (const pid of Object.keys(gridSamples)) {
      values.push(Math.max(0, ...gridSamples[pid][i]))
    }
    const sum = values.reduce((acc, v) => acc + v, 0)
    gridCombined.push(sum)
  }

  // Set the run-config
  const runConfig = document.getElementById("run-config")
  const runConfigHeading = document.createElement("div")
  runConfigHeading.innerText = `Run config`
  runConfigHeading.className = "font-bold"
  runConfig.appendChild(runConfigHeading)

  const runConfigSamplePeriod = document.createElement("div")
  runConfigSamplePeriod.innerText = `Sample period: ${sampledPeriod}ms`
  runConfigSamplePeriod.className = "pl-4"
  runConfig.appendChild(runConfigSamplePeriod)
  const runConfigRootCommand = document.createElement("div")
  runConfigRootCommand.innerText = `Root command: \`${rootCommand}\``
  runConfigRootCommand.className = "pl-4"
  runConfig.appendChild(runConfigRootCommand)
  const runConfigProjectDir = document.createElement("div")
  runConfigProjectDir.innerText = `Project directory: \`${projectDir}\``
  runConfigProjectDir.className = "pl-4"
  runConfig.appendChild(runConfigProjectDir)
  const runConfigTelemetryEnabled = document.createElement("div")
  runConfigTelemetryEnabled.innerText = `Telemetry enabled: ${telemetryEnabled}`
  runConfigTelemetryEnabled.className = "pl-4"
  runConfig.appendChild(runConfigTelemetryEnabled)

  // Set the run KPIs
  const runKPIs = document.getElementById("run-kpis")
  const runKPIsHeading = document.createElement("div")
  runKPIsHeading.innerText = `Run KPIs`
  runKPIsHeading.className = "font-bold"
  runKPIs.appendChild(runKPIsHeading)

  const runKPIsPIDCount = document.createElement("div")
  runKPIsPIDCount.innerText = `PID count: ${Object.keys(pidCommands).length}`
  runKPIsPIDCount.className = "pl-4"
  runKPIs.appendChild(runKPIsPIDCount)

  const runKPIsSampleCount = document.createElement("div")
  runKPIsSampleCount.innerText = `Sample count: ${rawSamples.length}`
  runKPIsSampleCount.className = "pl-4"
  runKPIs.appendChild(runKPIsSampleCount)

  const runKPIsRunLifetime = document.createElement("div")
  runKPIsRunLifetime.innerText = `Run lifetime: ${(sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0]) / 1000} seconds`
  runKPIsRunLifetime.className = "pl-4"
  runKPIs.appendChild(runKPIsRunLifetime)

  const runKPIsMaxMemory = document.createElement("div")
  runKPIsMaxMemory.innerText = `Max memory: ${(Math.max(...gridCombined) / 1024 / 1024).toFixed(3)} MB (grid)`
  runKPIsMaxMemory.className = "pl-4"
  runKPIs.appendChild(runKPIsMaxMemory)

  const runKPIsMeanMemory = document.createElement("div")
  runKPIsMeanMemory.innerText = `Mean memory: ${(gridCombined.reduce((acc, v) => acc + v, 0) / gridCombined.length / 1024 / 1024).toFixed(3)} MB (grid)`
  runKPIsMeanMemory.className = "pl-4"
  runKPIs.appendChild(runKPIsMeanMemory)

  const sortedCombined = [...gridCombined].sort()
  const runKPIsMedianMemory = document.createElement("div")
  runKPIsMedianMemory.innerText = `Median memory: ${(sortedCombined[Math.floor(sortedCombined.length / 2)] / 1024 / 1024).toFixed(3)} MB (grid)`
  runKPIsMedianMemory.className = "pl-4"
  runKPIs.appendChild(runKPIsMedianMemory)

  // Set the pid details
  const pidDetails = document.getElementById("pid-details")
  const pidDetailsHeading = document.createElement("div")
  pidDetailsHeading.innerText = `PID details`
  pidDetailsHeading.className = "font-bold"
  pidDetails.appendChild(pidDetailsHeading)

  for (const [pid, command] of Object.entries(pidCommands)) {
    const row = document.createElement("div")
    row.className = "mb-2"

    const pidEl = document.createElement("div")
    pidEl.className = "pl-4"
    pidEl.innerText = pid
    row.appendChild(pidEl)

    const commandEl = document.createElement("div")
    commandEl.className = "pl-8"
    commandEl.innerText = command
    row.appendChild(commandEl)

    const dataPoints = samples[pid].length ?? 0
    const dataPointsEl = document.createElement("div")
    dataPointsEl.className = "pl-8"
    dataPointsEl.innerText = `Data points: ${dataPoints}`
    row.appendChild(dataPointsEl)

    // Skip further details if there are no data points
    if (dataPoints === 0) {
      pidDetails.appendChild(row)
      continue
    }


    const max = (Math.max(...samples[pid].map(p => p.memory)) / 1024 / 1024).toFixed(3)
    const maxEl = document.createElement("div")
    maxEl.className = "pl-8"
    maxEl.innerText = `Max: ${max} MB`
    row.appendChild(maxEl)

    const mean = (samples[pid].reduce((acc, p) => acc + p.memory, 0) / samples[pid].length / 1024 / 1024).toFixed(3)
    const meanEl = document.createElement("div")
    meanEl.className = "pl-8"
    meanEl.innerText = `Mean: ${mean} MB`
    row.appendChild(meanEl)

    const sorted = [...samples[pid].map(p => p.memory)].sort()
    const median = (sorted[Math.floor(sorted.length / 2)] / 1024 / 1024).toFixed(3)
    const medianEl = document.createElement("div")
    medianEl.className = "pl-8"
    medianEl.innerText = `Median: ${median} MB`
    row.appendChild(medianEl)

    const min = (Math.min(...samples[pid].map(p => p.memory)) / 1024 / 1024).toFixed(3)
    const minEl = document.createElement("div")
    minEl.className = "pl-8"
    minEl.innerText = `Min: ${min} MB`
    row.appendChild(minEl)

    const sortedTimestamps = [...samples[pid].map(p => p.timestamp)].sort()
    const lifetime = (sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0]) / 1000
    const lifetimeEl = document.createElement("div")
    lifetimeEl.className = "pl-8"
    lifetimeEl.innerText = `Lifetime: ${lifetime} seconds`
    row.appendChild(lifetimeEl)

    pidDetails.appendChild(row)
  }

  // Chart tooltip for pid command
  const tooltipFooter = (tooltipItems) => {
    return "\n---\n" + pidCommands[tooltipItems[0].dataset.label]?.split(" ").join('\n') ?? "*unknown*";
  }

  // Chart plugin to draw horizontal lines
  const plugin = {
    id: 'horizontalLines',
    defaults: {
      lines: []
    },
    afterDraw: (chart, _, options) => {
      const { ctx } = chart
      const { left, right } = chart.chartArea

      const lines = options.lines
      if (!lines) return
      for (const line of lines) {
        const scale = chart.scales.y

        const width = line.width || 1
        const color = line.color || 'rgba(169,169,169, .6)'
        const value = line.value ? scale.getPixelForValue(line.value) : 0
        const label = line.label || null

        if (value) {
          ctx.beginPath()
          ctx.lineWidth = width
          ctx.moveTo(left, value)
          ctx.lineTo(right, value)
          ctx.strokeStyle = color
          ctx.stroke()
        }

        if (label) {
          ctx.fillStyle = color
          ctx.fillText(label, left + label.length, value + width - 10)
        }
      }

      return
    }
  }
  Chart.register(plugin)

  // Chart - total on grid
  const ctxGridTotal = document.getElementById('chart-grid-total');
  new Chart(ctxGridTotal, {
    type: 'line',
    data: {
      labels: gridTimestamps,
      datasets: [{
        label: 'Total',
        data: gridCombined.map(v => v / 1024 / 1024),
        fill: true,
        tension: 0.4
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: 20
      },
      plugins: {
        legend: {
          display: false,
        },
        'horizontalLines': {
          // lines: [{
          //   value: 512,
          //   color: 'rgba(255, 140, 0, 1.0)',
          //   label: '512 MB',
          // },
          // {
          //   value: 1024,
          //   color: 'red',
          //   label: '1024 MB',
          // }]
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
  })

  // Chart - individual on grid
  const datasets = []
  for (const pid of Object.keys(gridSamples)) {
    const data = []
    for (let i = 0; i < gridTimestamps.length - 1; i++) {
      if (gridSamples[pid][i].length === 0) {
        data.push(null)
        continue
      }
      const max = Math.max(...gridSamples[pid][i], 0)
      data.push(max / 1024 / 1024)
    }
    datasets.push({
      label: pid,
      data: data,
      fill: true,
      tension: 0.4
    })
  }

  const ctxGridIndividual = document.getElementById('chart-grid-individual');
  new Chart(ctxGridIndividual, {
    type: 'line',
    data: {
      labels: gridTimestamps,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: 20
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        'horizontalLines': {
          // lines: [{
          //   value: 512,
          //   color: 'rgba(255, 140, 0, 1.0)',
          //   label: '512 MB',
          // },
          // {
          //   value: 1024,
          //   color: 'red',
          //   label: '1024 MB',
          // }]
        },
        tooltip: {
          callbacks: {
            footer: tooltipFooter,
          }
        }
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
  })

  // Chart - individual off grid
  const datasetsIndividual = []
  for (const pid of Object.keys(samples)) {
    const data = []
    for (let i = 0; i < sortedTimestamps.length; i++) {
      const dataPoint = samples[pid].find(p => p.timestamp === sortedTimestamps[i])
      if (!dataPoint) {
        data.push(null)
        continue
      }
      data.push(dataPoint.memory / 1024 / 1024)
    }
    datasetsIndividual.push({
      label: pid,
      data: data,
      tension: 0.4
    })
  }

  const ctxIndividual = document.getElementById('chart-individual');
  new Chart(ctxIndividual, {
    type: 'line',
    data: {
      labels: zeroAdjustedTimes,
      datasets: datasetsIndividual,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: 20
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        'horizontalLines': {
          // lines: [{
          //   value: 512,
          //   color: 'rgba(255, 140, 0, 1.0)',
          //   label: '512 MB',
          // },
          // {
          //   value: 1024,
          //   color: 'red',
          //   label: '1024 MB',
          // }]
        },
        tooltip: {
          callbacks: {
            footer: tooltipFooter,
          }
        }
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
  })

}

main()
