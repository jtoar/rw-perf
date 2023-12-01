
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

  // Totals chart
  datasetTotal = {
    label: "Total",
    data: totalMemory,
    borderWidth: 1,
    fill: 'origin'
  }

  // Create the chart
  const ctxTotal = document.getElementById('chart-total');
  new Chart(ctxTotal, {
    type: 'line',
    data: {
      labels: times,
      datasets: [datasetTotal]
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
            text: 'RSS (kilobytes)'
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
}

main()
