const cp = require("child_process");
const fs = require('fs')
const path = require('path')

const pidusage = require('pidusage');
const pidtree = require('pidtree');

// Config
const SAMPLE_PERIOD = 25 // milliseconds
const ROOT_COMMAND = ['yarn', 'rw', 'build', '--no-prerender']

/**
 * Full build
 * 'yarn', 'rw', 'build', '--no-prerender'
 * 'node', './node_modules/.bin/redwood', 'build', '--no-prerender', '--cwd', '/Users/jgmw/Development/redwood/rw-test/rw-perf/test-project-6.4.1'
 *
 * API only
 * 'yarn', 'rw', 'build', 'api'
 * 'node', './node_modules/.bin/redwood', 'build', 'api', '--cwd', '/Users/jgmw/Development/redwood/rw-test/rw-perf/test-project-6.4.1'
 * 
 * Web only
 * 'yarn', 'rw', 'build', 'web', '--no-prerender'
 * 'node', './node_modules/.bin/redwood', 'build', 'web', '--no-prerender', '--cwd', '/Users/jgmw/Development/redwood/rw-test/rw-perf/test-project-6.4.1'
 */

// Data
const sampleData = new Array()
const trackedPids = new Set()
const pidCommands = new Map()
let projectDir = "."

async function main() {

  // Extract the directory for the root command to be run in from the command line arguments
  const [project] = process.argv.slice(2)
  projectDir = path.resolve(__dirname, project)

  console.log(`Measuring memory usage for \`${ROOT_COMMAND.join(' ')}\` in ${projectDir}`)

  // Run the root command
  const child = cp.spawn(ROOT_COMMAND[0], ROOT_COMMAND.slice(1), { cwd: projectDir, stdio: ['pipe', 'pipe', 'inherit'] });

  // Track the root command
  trackedPids.add(child.pid)
  getPIDCommand(child.pid)

  // Being the sampling loop
  const intervalId = setInterval(async () => {
    // Exit if we have no more tracked pids
    if (trackedPids.size === 0) {
      clearInterval(intervalId)
      
      // Write the data to the js file
      let data = ""
      data += `const telemetryEnabledJSON = \`${JSON.stringify(process.env.REDWOOD_DISABLE_TELEMETRY === undefined, undefined, 2)}\`;\n`
      data += `const sampledPeriodJSON = \`${JSON.stringify(SAMPLE_PERIOD, undefined, 2)}\`;\n`
      data += `const rootCommandJSON = \`${JSON.stringify(ROOT_COMMAND, undefined, 2)}\`;\n`
      data += `const projectDirJSON = \`${JSON.stringify(projectDir, undefined, 2)}\`;\n`
      data += `const pidCommandsJSON = \`${JSON.stringify(Array.from(pidCommands.entries()), undefined, 2)}\`;\n`
      data += `const rawSamplesJSON = \`${JSON.stringify(sampleData, undefined, 2)}\`;\n`
      fs.writeFileSync(path.join('visualise', 'visualiseData.js'), data)
      return
    }

    // Get all pids in the tree
    const pids = new Set()
    for (const pid of trackedPids) {
      try {
        const tree = await pidtree(pid, { root: true })
        for (const child of tree) {
          pids.add(child)
          getPIDCommand(child)
        }
      } catch (error) {
        trackedPids.delete(pid)
      }
    }

    // Log the pids we're tracking
    process.stdout.write(`\rTracking PIDs: [${Array.from(pids.values()).join(', ')}]`.padEnd(process.stdout.columns - 1, ' '))

    // Measure each PIDs memory usage
    const stats = await Promise.allSettled([...pids].map(pid => pidusage(pid)))
    sampleData.push(stats.map(s => s.value))

  }, SAMPLE_PERIOD)
}

// Spawns a ps command to get the command for a given pid
async function getPIDCommand(pid) {
  if (pidCommands.has(pid)) {
    return
  }
  const child = cp.spawn('ps', ['-o command=', `-p ${pid}`], { stdio: 'pipe' })
  let stdout = ''
  child.stdout.on('data', (data) => {
    stdout += data.toString()
  })
  child.on('close', () => {
    const args = stdout.trim()
    if (!args) {
      return
    }
    pidCommands.set(pid, btoa(args))
  })
}

// Run
main()
