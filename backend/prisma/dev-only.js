// The dev seeds (`seed.js`, `sample-data-seed.js`) create accounts with passwords
// that are published in the README, including a System Admin. Call this first
// thing, before anything touches the database, so they refuse to run in production.
module.exports = function assertDevOnly(script) {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      `${script} creates test accounts with published passwords and must not run when NODE_ENV=production.`,
    );
    process.exit(1);
  }
};
