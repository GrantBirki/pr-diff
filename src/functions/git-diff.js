import * as core from '@actions/core'
import parseGitDiff from 'parse-git-diff'
import { exec } from 'child_process'
import { promisify } from 'util';
import { writeFileSync } from 'fs'

// Helper function to get the diff from the git command
// :returns: The diff object which is parsed git diff
// If an error occurs, setFailed is called and it returns null
export async function gitDiff() {
  try {
    const execAsync = promisify(exec)

    // Get the base branch to use for the diff
    const baseBranch = core.getInput('base_branch')
    core.debug(`base_branch: ${baseBranch}`)
    const searchPath = core.getInput('search_path')
    core.debug(`search_path: ${searchPath}`)
    const maxBufferSizeInput = parseInt(core.getInput('max_buffer_size'))
    core.debug(`max_buffer_size: ${maxBufferSize}`)
    const fileOutputOnly = core.getInput('file_output_only') === 'true'

    // if max_buffer_size is not defined, just use the default
    var maxBufferSize = maxBufferSizeInput
    if (
      isNaN(maxBufferSizeInput) ||
      maxBufferSizeInput === null ||
      maxBufferSizeInput === undefined
    ) {
      core.info('max_buffer_size is not defined, using default of 1000000')
      maxBufferSize = 1000000
    }

    const { stdout, stderr } = await execAsync(`git diff ${baseBranch} ${searchPath}`, { maxBuffer: maxBufferSize });

    if (stderr) {
      core.setFailed(`git diff error: ${stderr}`)
      return
    }

    // only log the raw diff if the Action is explicitly set to run in debug mode
    core.debug(`raw git diff: ${stdout}`)
    if (fileOutputOnly === false) {
      // only set the output if fileOutputOnly is false
      core.setOutput('raw-diff', stdout)
    }

    // Write the raw diff to a file if the path is provided
    const rawPath = core.getInput('raw_diff_file_output')
    if (rawPath) {
      core.debug(`writing raw diff to ${rawPath}`)
      core.setOutput('raw-diff-path', rawPath)
      writeFileSync(rawPath, stdout)
    }

    // JSON diff
    const diff = parseGitDiff(stdout)
    const jsonDiff = JSON.stringify(diff)

    // only log the json diff if the Action is explicitly set to run in debug mode
    core.debug(`jsonDiff: ${jsonDiff}`)

    // only set the output if fileOutputOnly is false
    if (fileOutputOnly === false) {
      core.setOutput('json-diff', jsonDiff)
    }

    // Write the JSON diff to a file if the path is provided
    const jsonPath = core.getInput('json_diff_file_output')
    if (jsonPath) {
      core.debug(`writing json diff to ${jsonPath}`)
      core.setOutput('json-diff-path', jsonPath)
      writeFileSync(jsonPath, jsonDiff)
    }

    return diff
  } catch (e) {
    core.setFailed(`error getting git diff: ${e}`)
  }
}
