if (!process.versions || !process.versions.bun) {
  console.error('\nERROR: Please use Bun to install dependencies for this project.\n');
  process.exit(1);
}
