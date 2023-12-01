const cp = require("child_process");
const fs = require('fs')
const path = require('path')

const pidusageTree = require('pidusage-tree');

async function main() {
  const data = []

  const [project] = process.argv.slice(2)
  const projectDir = path.resolve(__dirname, project)
  console.log(`Measuring memory usage for \`yarn rw build --no-prerender\` in ${projectDir}`)

  const child = cp.spawn('yarn', ['rw', 'build', '--no-prerender'], { cwd: projectDir });

  const intervalId = setInterval(async () => {
    const stats = await pidusageTree(child.pid)

    const total = Object.entries(stats).reduce((total, [_pid, stat]) => {
      total += stat.memory
      return total
    }, 0)

    stats.total = total
    stats.totalMB = total / 1024 / 1024

    data.push(stats)

    process.stdout.write(`\r${stats.totalMB}`)
  }, 100)

  child.on('exit', () => {
    clearInterval(intervalId);

    process.stdout.write(`\r${[
      '',
      `Data points: ${data.length}`,
      `Max:         ${data.map(d => d.totalMB).reduce((a, b) => Math.max(a, b))}`,
      `Average:     ${data.map(d => d.totalMB).reduce((a, b) => a + b) / data.length}`,
      `Median:      ${data.sort((a, b) => a.totalMB - b.totalMB)[Math.floor(data.length / 2)].totalMB}`,
      '',
    ].join('\n')}`)

    fs.writeFileSync('pidusageTreeData.json', JSON.stringify(data, null, 2))
    fs.writeFileSync(path.join('visualise', 'visualise-data.js'), `const rawDataJSON = \`${JSON.stringify(data, null, 2)}\`;`)
  })
}

main()
