// Preserve the historical default (Vienna and QGD) and --alien selection.
// Explicit generic filters override this compatibility default.
if (!process.argv.some(arg => ['--alien', '--side', '--course'].includes(arg))) process.argv.push('--exclude-course', 'white-alien-gambit-main');
await import('./verify-courses.mjs');
