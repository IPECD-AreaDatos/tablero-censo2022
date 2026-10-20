module.exports = {
  apps: [
    {
      name: 'dashboard-censo',
      cwd: __dirname,
      script: 'node_modules/next/dist/bin/next',
      args: 'start --hostname 127.0.0.1 --port 3012',
      interpreter: '/home/ubuntu/.nvm/versions/node/v22.23.1/bin/node',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_BASE_PATH: '/dashboard-censo',
      },
    },
  ],
};
