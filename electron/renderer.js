// DOM elements
const runButton = document.getElementById('runTests')
const statusElement = document.getElementById('status')
const resultsContainer = document.getElementById('results')
const outputElement = document.getElementById('output')
const summaryElement = document.getElementById('summary')

// State
let isRunning = false

// Event listeners
runButton.addEventListener('click', runTests)

async function runTests() {
    if (isRunning) return
    
    console.log('Starting test run...')
    setRunning(true)
    setStatus('Running tests...', 'running')
    showResults()
    clearOutput()
    
    try {
        console.log('Calling electronAPI.runTests()...')
        const result = await window.electronAPI.runTests()
        console.log('Test result received:', result)
        displayResults(result)
    } catch (error) {
        console.error('Test execution error:', error)
        displayError(error)
    } finally {
        setRunning(false)
    }
}

function setRunning(running) {
    isRunning = running
    runButton.disabled = running
    runButton.textContent = running ? 'Running...' : 'Run All Tests'
}

function setStatus(message, type = '') {
    statusElement.textContent = message
    statusElement.className = `status ${type}`
}

function showResults() {
    resultsContainer.classList.remove('hidden')
}

function clearOutput() {
    outputElement.textContent = ''
    summaryElement.textContent = ''
    summaryElement.className = 'test-summary'
}

function displayResults(result) {
    console.log('Displaying results:', result)
    
    // Display the full output
    const fullOutput = result.stdout + (result.stderr || '')
    console.log('Full output:', fullOutput)
    outputElement.textContent = fullOutput
    
    // Parse and display summary
    const summary = parseTestSummary(result.stdout)
    console.log('Parsed summary:', summary)
    
    if (summary) {
        summaryElement.textContent = summary.text
        summaryElement.className = `test-summary ${summary.success ? 'success' : 'error'}`
        
        setStatus(
            summary.success ? '✅ All tests passed!' : '❌ Some tests failed',
            summary.success ? 'success' : 'error'
        )
    } else {
        summaryElement.textContent = `Exit code: ${result.exitCode}`
        summaryElement.className = `test-summary ${result.success ? 'success' : 'error'}`
        
        setStatus(
            result.success ? '✅ Tests completed' : '❌ Tests failed',
            result.success ? 'success' : 'error'
        )
    }
}

function displayError(error) {
    outputElement.textContent = `Error running tests: ${error.message}`
    summaryElement.textContent = 'Failed to execute tests'
    summaryElement.className = 'test-summary error'
    setStatus('❌ Failed to run tests', 'error')
}

function parseTestSummary(output) {
    // Look for vitest output patterns
    const testFileMatch = output.match(/Test Files\s+(\d+)\s+passed\s+\((\d+)\)/)
    const testMatch = output.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/)
    
    if (testFileMatch && testMatch) {
        const testFiles = testFileMatch[1]
        const totalTestFiles = testFileMatch[2]
        const tests = testMatch[1]
        const totalTests = testMatch[2]
        
        const allPassed = testFiles === totalTestFiles && tests === totalTests
        
        return {
            success: allPassed,
            text: `${tests}/${totalTests} tests passed across ${testFiles}/${totalTestFiles} test files`
        }
    }
    
    // Fallback for other patterns
    if (output.includes('Test Files') && output.includes('Tests')) {
        const hasFailures = output.includes('failed') || output.includes('FAIL')
        return {
            success: !hasFailures,
            text: hasFailures ? 'Some tests failed - see output above' : 'All tests passed'
        }
    }
    
    return null
}