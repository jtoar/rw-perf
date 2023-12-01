const cp = require("child_process");
const fs = require('fs')
const path = require('path')

const pidusage = require('pidusage');
const pidtree = require('pidtree');
const pidArgs = new Map()

async function getPIDArgs(pid) {
  if (pidArgs.has(pid)) {
    return
  }

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
  const data = new Map()
  const trackedPids = new Set()

  const [project] = process.argv.slice(2)
  const projectDir = path.resolve(__dirname, project)
  console.log(`Measuring memory usage for \`yarn rw build --no-prerender\` in ${projectDir}`)

  const child = cp.spawn('yarn', ['rw', 'build', '--no-prerender'], { cwd: projectDir });
  trackedPids.add(child.pid)
  getPIDArgs(child.pid)

  const intervalId = setInterval(async () => {
    // Exit if we have no more tracked pids
    if (trackedPids.size === 0) {
      clearInterval(intervalId)
      fs.writeFileSync(
        path.join('visualise', 'visualise-data.js'),
        `const rawDataJSON = \`${JSON.stringify(Object.fromEntries(data), undefined, 2)}\`;\nconst rawArgsJSON = \`${JSON.stringify(Object.fromEntries(pidArgs), undefined, 2)}\`;`
      )
      return
    }

    // Get all pids in the tree
    const pids = new Set()
    for (const pid of trackedPids) {
      try {
        const tree = await pidtree(pid, { root: true })
        for (const child of tree) {
          pids.add(child)
          getPIDArgs(child)
        }
      } catch (error) {
        trackedPids.delete(pid)
      }
    }

    // Log the pids we're tracking
    process.stdout.write(`\rTracking PIDs: [${Array.from(pids.values()).join(', ')}]`.padEnd(process.stdout.columns - 1, ' '))

    // Measure each PIDs memory usage
    const stats = await Promise.allSettled([...pids].map(pid => pidusage(pid)))
    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i]

      // This came up once but I couldn't reproduce it, skip when no stat value is present
      if(stat.value === undefined){
        continue
      }

      if (data.has(stat.value.pid)) {
        data.get(stat.value.pid).push({
          memory: stat.value.memory,
          timestamp: stat.value.timestamp
        })
      } else {
        data.set(stat.value.pid, [{
          memory: stat.value.memory,
          timestamp: stat.value.timestamp
        }])
      }
    }

  }, 20)
}

main()
