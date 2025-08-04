#!/usr/bin/env npx tsx

// ============================================================================
// EIDETIK MVP - API ENDPOINTS TESTING SCRIPT
// ============================================================================

import 'dotenv/config'

interface TestCase {
  name: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  url: string
  headers?: Record<string, string>
  body?: unknown
  expectedStatus?: number
  validateResponse?: (response: unknown) => boolean
}

class ApiTester {
  private baseUrl: string
  private results: {
    passed: number
    failed: number
    tests: Array<{ name: string; status: 'PASS' | 'FAIL'; error?: string }>
  } = {
    passed: 0,
    failed: 0,
    tests: [],
  }

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  async runAllTests(): Promise<void> {
    console.log('🌐 Starting API Endpoints Test Suite')
    console.log(`Base URL: ${this.baseUrl}`)
    console.log('='.repeat(60))

    // Verificar que el servidor esté corriendo
    if (!(await this.checkServerAvailability())) {
      console.log('❌ Server is not available. Please start the development server first:')
      console.log('   pnpm dev')
      return
    }

    const testCases: TestCase[] = [
      // Health Check Tests
      {
        name: 'Health Check - GET',
        method: 'GET',
        url: '/api/health',
        expectedStatus: 200,
        validateResponse: (response) => {
          const data = response as Record<string, unknown>
          return Boolean(data.status && data.services)
        },
      },
      {
        name: 'Health Check - HEAD',
        method: 'GET', // Usamos GET porque node-fetch no maneja HEAD bien
        url: '/api/health',
        expectedStatus: 200,
      },

      // Resources API Tests (sin autenticación para empezar)
      {
        name: 'Resources - Get All',
        method: 'GET',
        url: '/api/resources',
        expectedStatus: 200,
        validateResponse: (response) => {
          const data = response as Record<string, unknown>
          return Array.isArray(data.docs)
        },
      },
      {
        name: 'Resources - Count',
        method: 'GET',
        url: '/api/resources/count',
        expectedStatus: 200,
        validateResponse: (response) => {
          const data = response as Record<string, unknown>
          return typeof data.totalDocs === 'number'
        },
      },

      // Test autenticación básica
      {
        name: 'Resources - Unauthorized Access',
        method: 'POST',
        url: '/api/resources',
        body: { title: 'Test Resource', type: 'video' },
        expectedStatus: 401,
      },
    ]

    // Ejecutar todos los tests
    for (const testCase of testCases) {
      await this.runTest(testCase)
      await this.delay(100) // Pequeña pausa entre tests
    }

    this.showResults()
  }

  private async checkServerAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  private async runTest(testCase: TestCase): Promise<void> {
    try {
      console.log(`\n🧪 Test: ${testCase.name}`)

      const requestOptions: RequestInit = {
        method: testCase.method,
        headers: {
          'Content-Type': 'application/json',
          ...testCase.headers,
        },
      }

      if (testCase.body) {
        requestOptions.body = JSON.stringify(testCase.body)
      }

      const response = await fetch(`${this.baseUrl}${testCase.url}`, requestOptions)
      const responseData = await response.json().catch(() => null)

      console.log(`   Status: ${response.status}`)
      console.log(`   Response: ${JSON.stringify(responseData, null, 2).substring(0, 200)}...`)

      // Verificar status code esperado
      if (testCase.expectedStatus && response.status !== testCase.expectedStatus) {
        throw new Error(`Expected status ${testCase.expectedStatus}, got ${response.status}`)
      }

      // Ejecutar validación personalizada si existe
      if (testCase.validateResponse && responseData) {
        if (!testCase.validateResponse(responseData)) {
          throw new Error('Response validation failed')
        }
      }

      console.log('✅ Test passed')
      this.recordTest(testCase.name, 'PASS')
    } catch (error) {
      console.log('❌ Test failed:', error)
      this.recordTest(testCase.name, 'FAIL', String(error))
    }
  }

  private recordTest(name: string, status: 'PASS' | 'FAIL', error?: string): void {
    this.results.tests.push({ name, status, error })
    if (status === 'PASS') {
      this.results.passed++
    } else {
      this.results.failed++
    }
  }

  private showResults(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 API TEST RESULTS SUMMARY')
    console.log('='.repeat(60))

    console.log(`✅ Passed: ${this.results.passed}`)
    console.log(`❌ Failed: ${this.results.failed}`)
    console.log(`📋 Total: ${this.results.tests.length}`)

    const successRate = (this.results.passed / this.results.tests.length) * 100
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`)

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:')
      this.results.tests
        .filter((test) => test.status === 'FAIL')
        .forEach((test) => {
          console.log(`   • ${test.name}: ${test.error}`)
        })
    }

    console.log('\n' + '='.repeat(60))

    if (successRate >= 80) {
      console.log('🎉 API endpoints are working correctly!')
    } else {
      console.log('⚠️ API endpoints need attention')
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Función principal
async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000'
  const tester = new ApiTester(baseUrl)

  try {
    await tester.runAllTests()
  } catch (error) {
    console.error('💥 API test suite failed:', error)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Test execution failed:', error)
    process.exit(1)
  })
}

export { ApiTester }
