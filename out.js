
async function main() {
    const rawData = memData

    // Put raw data into the pre tag
    const pre = document.getElementById("raw-data")
    pre.innerHTML = rawData

    // Extract the data
    const dataLines = rawData.split("\n").map(line => line.trim()).filter(line => line !== "")

    const terminalPID = dataLines[0].trim()
    const times = []
    const data = []

    let i = 1;
    while (i < dataLines.length) {
        // First line in batch is the timestamp in nanoseconds
        times.push(dataLines[i])
        data.push({})
        i += 1

        let line = dataLines[i]
        while (line?.includes(" ")) {
            // Split the line into PID and RSS 
            const [pid, rss] = line.split(" ").filter(item => item !== "")
            data[times.length - 1][pid] = rss

            i += 1
            line = dataLines[i]
        }
    }

    const PIDs = new Set()
    for (let i = 0; i < data.length; i++) {
        for (const pid in data[i]) {
            PIDs.add(pid)
        }
    }
    const datasets = []
    for (const pid of PIDs) {
        const dataset = {
            label: pid,
            data: [],
            borderWidth: 1,
            // fill: 'origin'
        }
        for (let i = 0; i < data.length; i++) {
            dataset.data.push(data[i][pid] ?? 0)
        }
        datasets.push(dataset)
    }

    // Put neat data into the pre tag
    const neat = document.getElementById("neat-data")
    neat.innerHTML = JSON.stringify({ terminalPID, times, data }, undefined, 2)

    // Create the chart
    const ctx = document.getElementById('chart');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: times,
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
                        text: 'RSS (kilobytes)'
                    },
                    // stacked: true
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time (nanoseconds)'
                    }
                }
            }
        },
    });
}

main()