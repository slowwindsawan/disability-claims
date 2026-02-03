module.exports = {
  apps: [{
    name: 'frontend',
    script: 'npx',
    args: 'serve out -l 3000 -c serve.json',
    cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
