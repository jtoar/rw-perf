const cp = require("child_process");
const fs = require('fs')
const path = require('path')

const pidusageTree = require('pidusage-tree');
const pidArgs = new Map()

async function getPIDArgs(pid) {
  const child = cp.spawn('ps', ['-o args=', `-p ${pid}`], { stdio: 'pipe' })
  let stdout = ''
  child.stdout.on('data', (data) => {
    stdout += data.toString()
  })
  child.on('exit', () => {
    const args = stdout.trim()
    if (!args) {
      return
    }
    pidArgs.set(pid, btoa(args))
  })
}

async function main() {
  const data = []

  const [project] = process.argv.slice(2)
  const projectDir = path.resolve(__dirname, project)
  console.log(`Measuring memory usage for \`yarn rw build --no-prerender\` in ${projectDir}`)

  const child = cp.spawn('yarn', ['rw', 'build', '--no-prerender'], { cwd: projectDir });

  const intervalId = setInterval(async () => {
    let stats
    try {
      stats = await pidusageTree(child.pid)
    } catch (e) {
      // Sometimes we try to read the process once it's already exited
      // Note: There must be a typo in pidusage-tree's error message
      if (e === 'No matching pid found' || e === 'No maching pid found') {
        return
      }
      console.error('Error getting stats')
      console.error(e)
      return
    }

    const total = Object.entries(stats).reduce((total, [_pid, stat]) => {
      total += stat.memory
      return total
    }, 0)

    const pids = Object.keys(stats)
    for (let i = 0; i < pids.length; i++) {
      // Not awaiting to avoid blocking
      getPIDArgs(pids[i])
    }

    stats.total = total
    stats.totalMB = total / 1024 / 1024

    data.push(stats)

    process.stdout.write(`\r${stats.totalMB}`)
  }, 50)

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
    fs.writeFileSync(
      path.join('visualise', 'visualise-data.js'),
      `const rawDataJSON = \`${JSON.stringify(data, undefined, 2)}\`;
      const pidArgsJSON = \`${JSON.stringify(Array.from(pidArgs.entries()), undefined, 2)}\`;`
    )
  })
}

main()
