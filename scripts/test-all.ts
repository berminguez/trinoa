#!/usr/bin/env npx tsx

// ============================================================================
// EIDETIK MVP - COMPREHENSIVE TESTING SCRIPT
// ============================================================================

import 'dotenv/config'
import { spawn } from 'child_process'

import { ApiTester } from './test-api-endpoints'
import { QueueSystemTester } from './test-queue-system'
import { UploadEndpointTester } from './test-upload-endpoint'

interface TestSuite {
  name: string
  command?: string[]
  tester?: () => Promise<void>
  description: string
}

class ComprehensiveTester {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Eidetik Test Suite')
    console.log('='.repeat(80))
    console.log('🎯 Testing: Queue System + API Endpoints + Upload Endpoint + Build Verification')
    console.log('🌐 Base URL:', this.baseUrl)
    console.log('⏰ Started at:', new Date().toISOString())
    console.log('='.repeat(80))

    const testSuites: TestSuite[] = [
      {
        name: '1. Build Verification',
        command: ['pnpm', 'build'],
        description: 'Verify that the project builds without errors',
      },
      {
        name: '2. Type Checking',
        command: ['pnpm', 'type-check'],
        description: 'Verify TypeScript types are correct',
      },
      {
        name: '3. Queue System Testing',
        tester: async () => {
          const tester = new QueueSystemTester()
          await tester.runAllTests()
        },
        description: 'Test queue initialization, jobs, workers, and monitoring',
      },
      {
        name: '4. API Endpoints Testing',
        tester: async () => {
          const tester = new ApiTester(this.baseUrl)
          await tester.runAllTests()
        },
        description: 'Test health check and resource management endpoints',
      },
      {
        name: '5. Upload Endpoint Testing',
        tester: async () => {
          const tester = new UploadEndpointTester(this.baseUrl)
          await tester.runAllTests()
        },
        description: 'Test atomic file upload and resource creation',
      },
    ]

    let passed = 0
    let failed = 0

    for (const suite of testSuites) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`🧪 ${suite.name}`)
      console.log(`📝 ${suite.description}`)
      console.log(`${'='.repeat(60)}`)

      try {
        if (suite.command) {
          await this.runCommand(suite.command)
        } else if (suite.tester) {
          await suite.tester()
        }

        console.log(`✅ ${suite.name} - PASSED`)
        passed++
      } catch (error) {
        console.log(`❌ ${suite.name} - FAILED`)
        console.log(`Error: ${error}`)
        failed++
      }
    }

    // Resultados finales
    this.showFinalResults(passed, failed, testSuites.length)
  }

  private async runCommand(command: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Running: ${command.join(' ')}`)

      const process = spawn(command[0], command.slice(1), {
        stdio: 'inherit',
        shell: true,
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Command failed with exit code ${code}`))
        }
      })

      process.on('error', (error) => {
        reject(error)
      })
    })
  }

  private showFinalResults(passed: number, failed: number, total: number): void {
    console.log('\n' + '='.repeat(80))
    console.log('🏁 COMPREHENSIVE TEST RESULTS')
    console.log('='.repeat(80))

    console.log(`✅ Passed Test Suites: ${passed}`)
    console.log(`❌ Failed Test Suites: ${failed}`)
    console.log(`📋 Total Test Suites: ${total}`)

    const successRate = (passed / total) * 100
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`)

    console.log('\n📊 System Status:')

    if (successRate === 100) {
      console.log('🎉 ALL SYSTEMS GO! Eidetik is ready for video processing implementation.')
      console.log('✨ You can proceed with Task 4.0: Video Processing Pipeline')
    } else if (successRate >= 75) {
      console.log('⚠️  MOSTLY HEALTHY: Some issues detected but core functionality works.')
      console.log('🔧 Consider fixing failed tests before proceeding to Task 4.0')
    } else {
      console.log('🚨 CRITICAL ISSUES: Multiple system failures detected.')
      console.log('❗ Must fix issues before proceeding with development')
    }

    console.log('\n📚 Next Steps:')
    console.log('• If all tests pass: Continue with Task 4.0 (Video Processing)')
    console.log('• If tests fail: Review error messages and fix issues')
    console.log('• For production: Run workers with `pnpm tsx scripts/start-*-worker.ts`')
    console.log('• For monitoring: Use `pnpm tsx scripts/queue-monitor.ts --detailed`')

    console.log('\n⏰ Completed at:', new Date().toISOString())
    console.log('='.repeat(80))
  }
}

// CLI options
interface CliOptions {
  baseUrl: string
  skipBuild: boolean
  help: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    baseUrl: 'http://localhost:3000',
    skipBuild: false,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--base-url':
        options.baseUrl = args[++i] || 'http://localhost:3000'
        break
      case '--skip-build':
        options.skipBuild = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
    }
  }

  return options
}

function showHelp(): void {
  console.log(`
🧪 Eidetik Comprehensive Test Suite

Usage: pnpm tsx scripts/test-all.ts [options]

Options:
  --base-url <url>    Base URL for API testing (default: http://localhost:3000)
  --skip-build        Skip build verification tests
  --help, -h          Show this help message

Examples:
  pnpm tsx scripts/test-all.ts                    # Run all tests
  pnpm tsx scripts/test-all.ts --skip-build       # Skip build tests
  pnpm tsx scripts/test-all.ts --base-url http://localhost:3001

Prerequisites:
  1. MongoDB Atlas connection configured in .env
  2. Development server running (for API tests): pnpm dev
  3. All dependencies installed: pnpm install

Test Suites:
  1. Build Verification - Ensures project builds correctly
  2. Type Checking - Validates TypeScript types
  3. Queue System - Tests Agenda jobs, workers, monitoring
  4. API Endpoints - Tests health check and resource APIs
  5. Upload Endpoint - Tests atomic file upload and resource creation
`)
}

// Función principal
async function main() {
  const options = parseArgs()

  if (options.help) {
    showHelp()
    return
  }

  console.log('🚀 Initializing Eidetik Test Suite...')

  if (options.skipBuild) {
    console.log('⏭️  Skipping build verification tests')
  }

  const tester = new ComprehensiveTester(options.baseUrl)

  try {
    await tester.runAllTests()
  } catch (error) {
    console.error('💥 Test suite execution failed:', error)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Test initialization failed:', error)
    process.exit(1)
  })
}

export { ComprehensiveTester }
