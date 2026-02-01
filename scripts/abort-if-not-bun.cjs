if (!process.env.bun_execpath || !process.env.bun_execpath.includes('bun')) {
  console.error('\nERROR: Please use Bun to install dependencies for this project.\n');
  process.exit(1);
}