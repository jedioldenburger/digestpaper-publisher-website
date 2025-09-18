#!/usr/bin/env node

/**
 * Test script for DigestPaper Media Page Generator
 * Validates functionality and output quality
 */

const fs = require('fs');
const path = require('path');
const { generateHTML, generateEnhancedSitemap, ENHANCED_PAGE_DEFINITIONS, CONFIG } = require('./enhanced-generator');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(title) {
  console.log(colorize(`\n🧪 ${title}`, 'cyan'));
  console.log(colorize('='.repeat(50), 'cyan'));
}

function printSuccess(message) {
  console.log(colorize(`✅ ${message}`, 'green'));
}

function printError(message) {
  console.log(colorize(`❌ ${message}`, 'red'));
}

function printWarning(message) {
  console.log(colorize(`⚠️  ${message}`, 'yellow'));
}

function printInfo(message) {
  console.log(colorize(`ℹ️  ${message}`, 'blue'));
}

// Test configuration
const TEST_PAGES = [
  'projects',
  'portfolio/publications',
  'topics/ai',
  'about',
  'contact'
];

const REQUIRED_ELEMENTS = [
  '<title>',
  '</title>',
  '<meta name="description"',
  '<meta property="og:title"',
  '<meta name="twitter:title"',
  '<script type="application/ld+json">',
  '<main',
  '<h1',
  '</html>'
];

// Test functions
function testConfiguration() {
  printHeader('Testing Configuration');
  
  try {
    // Test required config properties
    const requiredProps = [
      'site.name',
      'site.baseUrl',
      'contact.email',
      'branding.defaultImage'
    ];
    
    for (const prop of requiredProps) {
      const value = prop.split('.').reduce((obj, key) => obj[key], CONFIG);
      if (!value) {
        throw new Error(`Missing required config property: ${prop}`);
      }
    }
    
    printSuccess('Configuration validation passed');
    return true;
  } catch (error) {
    printError(`Configuration test failed: ${error.message}`);
    return false;
  }
}

function testPageDefinitions() {
  printHeader('Testing Page Definitions');
  
  try {
    const pages = Object.keys(ENHANCED_PAGE_DEFINITIONS);
    
    if (pages.length === 0) {
      throw new Error('No page definitions found');
    }
    
    // Test each page definition
    for (const pagePath of pages) {
      const pageData = ENHANCED_PAGE_DEFINITIONS[pagePath];
      
      const requiredFields = ['title', 'h1', 'description', 'keywords', 'category'];
      for (const field of requiredFields) {
        if (!pageData[field]) {
          throw new Error(`Page ${pagePath} missing required field: ${field}`);
        }
      }
      
      // Test breadcrumbs
      if (!pageData.breadcrumbs || !Array.isArray(pageData.breadcrumbs)) {
        throw new Error(`Page ${pagePath} has invalid breadcrumbs`);
      }
    }
    
    printSuccess(`Page definitions validation passed (${pages.length} pages)`);
    return true;
  } catch (error) {
    printError(`Page definitions test failed: ${error.message}`);
    return false;
  }
}

function testHTMLGeneration() {
  printHeader('Testing HTML Generation');
  
  let passedTests = 0;
  let totalTests = TEST_PAGES.length;
  
  for (const pagePath of TEST_PAGES) {
    try {
      printInfo(`Testing page: ${pagePath}`);
      
      // Generate HTML
      const html = generateHTML(pagePath, { deterministic: true });
      
      if (!html || html.length < 1000) {
        throw new Error('Generated HTML is too short');
      }
      
      // Test required elements
      for (const element of REQUIRED_ELEMENTS) {
        if (!html.includes(element)) {
          throw new Error(`Missing required element: ${element}`);
        }
      }
      
      // Test page-specific content
      const pageData = ENHANCED_PAGE_DEFINITIONS[pagePath];
      if (!html.includes(pageData.h1)) {
        throw new Error(`Page H1 not found in generated HTML: ${pageData.h1}`);
      }
      
      if (!html.includes(pageData.description)) {
        throw new Error(`Page description not found in generated HTML`);
      }
      
      // Test structured data
      const jsonLdMatches = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
      if (!jsonLdMatches || jsonLdMatches.length === 0) {
        throw new Error('No structured data found');
      }
      
      // Validate JSON-LD
      for (const match of jsonLdMatches) {
        const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        try {
          JSON.parse(jsonContent);
        } catch (jsonError) {
          throw new Error(`Invalid JSON-LD: ${jsonError.message}`);
        }
      }
      
      printSuccess(`✓ ${pagePath}`);
      passedTests++;
      
    } catch (error) {
      printError(`✗ ${pagePath}: ${error.message}`);
    }
  }
  
  printInfo(`HTML generation test completed: ${passedTests}/${totalTests} passed`);
  return passedTests === totalTests;
}

function testSitemapGeneration() {
  printHeader('Testing Sitemap Generation');
  
  try {
    const sitemap = generateEnhancedSitemap();
    
    if (!sitemap || sitemap.length < 100) {
      throw new Error('Generated sitemap is too short');
    }
    
    // Test XML structure
    if (!sitemap.includes('<?xml version="1.0"')) {
      throw new Error('Missing XML declaration');
    }
    
    if (!sitemap.includes('<urlset')) {
      throw new Error('Missing urlset element');
    }
    
    if (!sitemap.includes('</urlset>')) {
      throw new Error('Missing closing urlset element');
    }
    
    // Count URLs
    const urlMatches = sitemap.match(/<url>/g);
    const urlCount = urlMatches ? urlMatches.length : 0;
    
    if (urlCount < Object.keys(ENHANCED_PAGE_DEFINITIONS).length) {
      throw new Error(`Insufficient URLs in sitemap: ${urlCount}`);
    }
    
    printSuccess(`Sitemap generation passed (${urlCount} URLs)`);
    return true;
  } catch (error) {
    printError(`Sitemap test failed: ${error.message}`);
    return false;
  }
}

function testDeterministicGeneration() {
  printHeader('Testing Deterministic Generation');
  
  try {
    const testPage = 'projects';
    
    // Generate same page twice with deterministic mode
    const html1 = generateHTML(testPage, { deterministic: true, seed: 'test-seed' });
    const html2 = generateHTML(testPage, { deterministic: true, seed: 'test-seed' });
    
    if (html1 !== html2) {
      // Debug: find differences
      const lines1 = html1.split('\n');
      const lines2 = html2.split('\n');
      
      for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
        if (lines1[i] !== lines2[i]) {
          printError(`Difference at line ${i + 1}:`);
          printError(`HTML1: ${lines1[i] || '(missing)'}`);
          printError(`HTML2: ${lines2[i] || '(missing)'}`);
          break;
        }
      }
      
      throw new Error('Deterministic generation failed - outputs differ');
    }
    
    // Generate with different seeds
    const html3 = generateHTML(testPage, { deterministic: true, seed: 'different-seed' });
    
    if (html1 === html3) {
      printWarning('Different seeds produced identical output (may be expected)');
    }
    
    printSuccess('Deterministic generation test passed');
    return true;
  } catch (error) {
    printError(`Deterministic test failed: ${error.message}`);
    return false;
  }
}

function testPerformance() {
  printHeader('Testing Performance');
  
  try {
    const testPage = 'portfolio';
    const iterations = 10;
    
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      generateHTML(testPage, { deterministic: true });
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    printInfo(`Generated ${iterations} pages in ${totalTime}ms`);
    printInfo(`Average generation time: ${avgTime.toFixed(2)}ms per page`);
    
    if (avgTime > 1000) {
      printWarning('Generation time is slower than expected');
    } else {
      printSuccess('Performance test passed');
    }
    
    return true;
  } catch (error) {
    printError(`Performance test failed: ${error.message}`);
    return false;
  }
}

function testErrorHandling() {
  printHeader('Testing Error Handling');
  
  try {
    // Test invalid page
    try {
      generateHTML('non-existent-page');
      throw new Error('Should have thrown error for non-existent page');
    } catch (error) {
      if (!error.message.includes('Page definition not found')) {
        throw new Error(`Unexpected error message: ${error.message}`);
      }
    }
    
    printSuccess('Error handling test passed');
    return true;
  } catch (error) {
    printError(`Error handling test failed: ${error.message}`);
    return false;
  }
}

// Main test runner
function runTests() {
  console.log(colorize('\n🚀 DigestPaper Media Page Generator - Test Suite', 'magenta'));
  console.log(colorize('=' .repeat(60), 'magenta'));
  
  const tests = [
    { name: 'Configuration', fn: testConfiguration },
    { name: 'Page Definitions', fn: testPageDefinitions },
    { name: 'HTML Generation', fn: testHTMLGeneration },
    { name: 'Sitemap Generation', fn: testSitemapGeneration },
    { name: 'Deterministic Generation', fn: testDeterministicGeneration },
    { name: 'Performance', fn: testPerformance },
    { name: 'Error Handling', fn: testErrorHandling }
  ];
  
  let passedTests = 0;
  const startTime = Date.now();
  
  for (const test of tests) {
    try {
      if (test.fn()) {
        passedTests++;
      }
    } catch (error) {
      printError(`Test ${test.name} threw unexpected error: ${error.message}`);
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  printHeader('Test Results');
  console.log(colorize(`Tests passed: ${passedTests}/${tests.length}`, 'cyan'));
  console.log(colorize(`Total time: ${totalTime}ms`, 'cyan'));
  
  if (passedTests === tests.length) {
    console.log(colorize('\n🎉 All tests passed!', 'green'));
    return true;
  } else {
    console.log(colorize(`\n💥 ${tests.length - passedTests} tests failed!`, 'red'));
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = {
  runTests,
  testConfiguration,
  testPageDefinitions,
  testHTMLGeneration,
  testSitemapGeneration
};