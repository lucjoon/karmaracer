#!/usr/bin/env node
/**
 * Karma Racer — browser smoke harness
 * Loads home + game pages in headless Chrome and reports JS / network errors.
 *
 * Usage:
 *   npm run test:browser
 *   node tools/browser-smoke.js [baseUrl]
 */
'use strict';

var path = require('path');
var fs = require('fs');

var BASE = process.argv[2] || process.env.KARMA_HOST || 'http://localhost:8080';
var CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function tryRequire(name) {
  try {
    return require(name);
  } catch (e) {
    return null;
  }
}

function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

function summarizeError(err) {
  if (!err) {
    return { message: String(err) };
  }
  if (typeof err === 'string') {
    return { message: err };
  }
  return {
    message: err.message || String(err),
    name: err.name,
    stack: err.stack
  };
}

async function collectPageIssues(browser, url, opts) {
  opts = opts || {};
  var page = await browser.newPage();
  var issues = {
    url: url,
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    requestFailures: [],
    ok: true
  };

  page.on('console', function(msg) {
    var type = msg.type();
    var text = msg.text();
    var loc = msg.location && msg.location();
    var entry = {
      type: type,
      text: text,
      url: loc && loc.url,
      line: loc && loc.lineNumber,
      column: loc && loc.columnNumber
    };
    if (type === 'error') {
      issues.consoleErrors.push(entry);
    } else if (type === 'warning') {
      issues.consoleWarnings.push(entry);
    }
  });

  page.on('pageerror', function(err) {
    issues.pageErrors.push(summarizeError(err));
  });

  page.on('requestfailed', function(req) {
    var failure = req.failure && req.failure();
    issues.requestFailures.push({
      url: req.url(),
      method: req.method(),
      errorText: failure && failure.errorText
    });
  });

  var response = await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: opts.timeout || 20000
  });
  issues.status = response && response.status();

  if (opts.waitMs) {
    await sleep(opts.waitMs);
  }

  if (opts.interact) {
    try {
      await page.focus('#game-canvas');
      await page.keyboard.down('ArrowUp');
      await sleep(500);
      await page.keyboard.up('ArrowUp');
      await page.keyboard.press('Space');
      await sleep(500);
    } catch (e) {
      issues.pageErrors.push({
        message: 'Interaction failed: ' + e.message,
        stack: e.stack
      });
    }
  }

  // Snapshot useful runtime state when on a game page
  if (opts.probeGame) {
    issues.probe = await page.evaluate(function() {
      var gi = window.Karma && window.Karma.gameInstance;
      return {
        hasKarma: !!window.Karma,
        hasGameInstance: !!gi,
        hasDrawEngine: !!(gi && gi.drawEngine),
        hasMyCar: !!(gi && gi.myCar),
        carsLoaded: !!(gi && gi.cars && Object.keys(gi.cars).length),
        clockSynced: !!(gi && gi.clockSync && typeof gi.clockSync.difference === 'number'),
        mapName: window.G_mapName || null,
        playerName: (window.Karma && window.Karma.LocalStorage && Karma.LocalStorage.get('playerName')) || null
      };
    });
  }

  await page.close();
    issues.ok =
    (issues.status === 200 || issues.status === 304) &&
    issues.pageErrors.length === 0 &&
    issues.consoleErrors.length === 0;
  return issues;
}

function printIssueReport(results) {
  console.log('\n========== Karma Racer browser smoke report ==========');
  console.log('Base URL:', BASE);
  console.log('Time:', new Date().toISOString());

  var totalPageErrors = 0;
  var totalConsoleErrors = 0;
  var totalFailures = 0;

  results.forEach(function(r, idx) {
    console.log('\n--- [' + (idx + 1) + '] ' + r.url + ' (HTTP ' + r.status + ') ---');
    if (r.probe) {
      console.log('Probe:', JSON.stringify(r.probe, null, 2));
    }

    if (r.pageErrors.length) {
      console.log('\nUncaught JS exceptions (' + r.pageErrors.length + '):');
      r.pageErrors.forEach(function(e, i) {
        totalPageErrors++;
        console.log('  ' + (i + 1) + '. ' + (e.name ? e.name + ': ' : '') + e.message);
        if (e.stack) {
          console.log(
            e.stack
              .split('\n')
              .slice(0, 8)
              .map(function(l) {
                return '     ' + l;
              })
              .join('\n')
          );
        }
      });
    } else {
      console.log('\nUncaught JS exceptions: none');
    }

    if (r.consoleErrors.length) {
      console.log('\nconsole.error (' + r.consoleErrors.length + '):');
      r.consoleErrors.forEach(function(e, i) {
        totalConsoleErrors++;
        console.log('  ' + (i + 1) + '. ' + e.text);
        if (e.url) {
          console.log('     at ' + e.url + ':' + e.line + ':' + e.column);
        }
      });
    } else {
      console.log('\nconsole.error: none');
    }

    if (r.requestFailures.length) {
      console.log('\nFailed network requests (' + r.requestFailures.length + '):');
      r.requestFailures.forEach(function(f, i) {
        // Ignore noisy analytics/facebook in the summary count for pass/fail,
        // but still list them.
        console.log('  ' + (i + 1) + '. [' + f.method + '] ' + f.url);
        console.log('     ' + f.errorText);
      });
    }

    if (r.consoleWarnings.length) {
      console.log('\nconsole.warn (' + r.consoleWarnings.length + ', truncated to 10):');
      r.consoleWarnings.slice(0, 10).forEach(function(e, i) {
        console.log('  ' + (i + 1) + '. ' + e.text);
      });
    }

    var hardFail =
      (r.status !== 200 && r.status !== 304) || r.pageErrors.length > 0 || r.consoleErrors.length > 0;
    if (hardFail) {
      totalFailures++;
      console.log('\nResult: FAIL');
    } else {
      console.log('\nResult: PASS (no page/console JS errors)');
    }
  });

  console.log('\n========== Summary ==========');
  console.log('Pages:', results.length);
  console.log('Pages with hard failures:', totalFailures);
  console.log('Uncaught exceptions:', totalPageErrors);
  console.log('console.error:', totalConsoleErrors);
  console.log('===============================================\n');

  return totalFailures === 0;
}

async function main() {
  var puppeteer = tryRequire('puppeteer-core');
  if (!puppeteer) {
    console.error('Missing puppeteer-core. Run: npm install --save-dev puppeteer-core');
    process.exit(2);
  }
  if (!fs.existsSync(CHROME)) {
    console.error('Chrome not found at', CHROME);
    console.error('Set CHROME_PATH to your Chrome binary.');
    process.exit(2);
  }

  var browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,800']
  });

  var results = [];
  try {
    // Seed a player name so the game skips the prompt dialog.
    var seed = await browser.newPage();
    await seed.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await seed.evaluate(function() {
      try {
        localStorage.karma = JSON.stringify({ playerName: 'SmokeBot' });
      } catch (e) {}
    });
    await seed.close();

    results.push(
      await collectPageIssues(browser, BASE + '/', {
        waitMs: 2000
      })
    );
    results.push(
      await collectPageIssues(browser, BASE + '/game.mini', {
        waitMs: 4000,
        interact: true,
        probeGame: true
      })
    );
    results.push(
      await collectPageIssues(browser, BASE + '/game.dust?draw=WEBGL', {
        waitMs: 5000,
        interact: true,
        probeGame: true
      })
    );
  } finally {
    await browser.close();
  }

  var outDir = path.join(__dirname, '..', 'tools', 'reports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  var reportPath = path.join(outDir, 'browser-smoke-' + Date.now() + '.json');
  fs.writeFileSync(reportPath, JSON.stringify({ base: BASE, results: results }, null, 2));
  console.log('JSON report:', reportPath);

  var ok = printIssueReport(results);
  process.exit(ok ? 0 : 1);
}

main().catch(function(err) {
  console.error('Harness crashed:', err);
  process.exit(2);
});
