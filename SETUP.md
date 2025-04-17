# Setup Guide

This guide will help you set up the Synix Bot on your system, regardless of your operating system.

## Prerequisites

### All Operating Systems
- Node.js >= 20.0.0
- MongoDB
- A Discord Application and Bot Token
- Visual Studio Code (Recommended IDE)
- TypeScript (will be installed with npm)
- npm (Node Package Manager)

### Windows
1. Install Node.js and npm:
   - Download from [nodejs.org](https://nodejs.org/)
   - Choose the LTS version
   - Run the installer and follow the instructions
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. Install MongoDB:
   - Download from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Run the installer
   - Follow the installation wizard
   - Add MongoDB to your system PATH
   - Start MongoDB service:
     ```bash
     net start MongoDB
     ```

3. Install Visual Studio Code:
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)
   - Run the installer
   - Install recommended extensions:
     - ESLint
     - Prettier
     - TypeScript and JavaScript Language Features

### macOS
1. Install Homebrew (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Install Node.js and npm:
   ```bash
   brew install node
   ```
   Verify installation:
   ```bash
   node --version
   npm --version
   ```

3. Install MongoDB:
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```
   Start MongoDB service:
   ```bash
   brew services start mongodb-community
   ```

4. Install Visual Studio Code:
   ```bash
   brew install --cask visual-studio-code
   ```
   Install recommended extensions:
   - ESLint
   - Prettier
   - TypeScript and JavaScript Language Features

### Linux (Ubuntu/Debian)
1. Install Node.js and npm:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
   Verify installation:
   ```bash
   node --version
   npm --version
   ```

2. Install MongoDB:
   ```bash
   sudo apt-get install -y mongodb
   sudo systemctl start mongodb
   sudo systemctl enable mongodb
   ```

3. Install Visual Studio Code:
   ```bash
   sudo snap install code --classic
   ```
   Install recommended extensions:
   - ESLint
   - Prettier
   - TypeScript and JavaScript Language Features

## Project Setup

### 1. Download and Extract Project Files
- Download the project files
- Extract them to your desired location
- Open the project in Visual Studio Code

### 2. Install Project Dependencies
```bash
npm install
```
This will install:
- TypeScript
- Discord.js
- MongoDB
- ESLint
- Prettier
- And other required dependencies

### 3. Environment Configuration
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` with your configuration:
   - Get your Discord Bot Token from the Discord Developer Portal
   - Set up your MongoDB connection string
   - Configure other settings as needed

### 4. Build the Project
```bash
npm run build
```

### 5. Deploy Commands
```bash
npm run deploy-commands
```

### 6. Start the Bot
```bash
npm start
```

## Development Setup

For development purposes, you can use:
```bash
npm run dev        # For development mode
npm run watch      # For auto-reload during development
```

## Building RELEASE Version

### Prerequisites for Release Build
- All development dependencies installed
- Production-ready environment variables configured
- MongoDB database properly set up
- Discord bot permissions configured

### Release Build Steps

1. **Clean Build Environment**
   ```bash
   # Remove node_modules and dist folder
   rm -rf node_modules
   rm -rf dist
   ```

2. **Install Production Dependencies**
   ```bash
   # Install only production dependencies
   npm install --production
   ```

3. **Build TypeScript**
   ```bash
   # Build the project with production settings
   npm run build
   ```

4. **Verify Build**
   ```bash
   # Check if dist folder contains all necessary files
   ls -la dist/
   ```

5. **Environment Configuration**
   - Ensure `.env` file is properly configured for production
   - Set `LOG_LEVEL=info` or `LOG_LEVEL=error` for production
   - Verify all required environment variables are set

6. **Deploy Commands**
   ```bash
   # Deploy slash commands to Discord
   npm run deploy-commands
   ```

### Production Deployment

1. **Create Production Directory**
   ```bash
   # Create a new directory for production
   mkdir -p /path/to/production
   ```

2. **Copy Required Files**
   ```bash
   # Copy necessary files to production directory
   cp -r dist/ /path/to/production/
   cp package.json /path/to/production/
   cp .env /path/to/production/
   ```

3. **Install Production Dependencies**
   ```bash
   cd /path/to/production
   npm install --production
   ```

4. **Start the Bot**
   ```bash
   # Start the bot in production mode
   npm start
   ```

### Production Best Practices

1. **Process Management**
   - Use PM2 for process management:
     ```bash
     # Install PM2 globally
     npm install -g pm2
     
     # Start the bot with PM2
     pm2 start dist/index.js --name "synix-bot"
     
     # Save PM2 process list
     pm2 save
     
     # Set PM2 to start on system boot
     pm2 startup
     ```

2. **Logging**
   - Configure proper logging in production:
     ```bash
     # View logs
     pm2 logs synix-bot
     
     # Rotate logs
     pm2 install pm2-logrotate
     ```

3. **Monitoring**
   - Monitor bot performance:
     ```bash
     # Show process information
     pm2 monit
     
     # Show process list
     pm2 list
     ```

4. **Backup Strategy**
   - Regular backups of:
     - MongoDB database
     - Environment configuration
     - Bot configuration files

5. **Security Considerations**
   - Use strong passwords for MongoDB
   - Regularly rotate Discord bot token
   - Keep dependencies updated
   - Monitor for security vulnerabilities:
     ```bash
     npm audit
     ```

### Updating Production Version

1. **Stop Current Version**
   ```bash
   pm2 stop synix-bot
   ```

2. **Backup Current Version**
   ```bash
   cp -r /path/to/production /path/to/backup/production_$(date +%Y%m%d)
   ```

3. **Deploy New Version**
   ```bash
   # Copy new files
   cp -r dist/ /path/to/production/
   cp package.json /path/to/production/
   
   # Update dependencies
   cd /path/to/production
   npm install --production
   ```

4. **Restart the Bot**
   ```bash
   pm2 restart synix-bot
   ```

### Troubleshooting Production Issues

1. **Check Logs**
   ```bash
   pm2 logs synix-bot
   ```

2. **Check Process Status**
   ```bash
   pm2 status
   ```

3. **Check Resource Usage**
   ```bash
   pm2 monit
   ```

4. **Common Production Issues**
   - Memory leaks
   - Database connection issues
   - Rate limiting
   - Network connectivity problems

## Troubleshooting

### Common Issues

1. **Node.js Version**
   - Ensure you have Node.js >= 20.0.0
   - Check version with: `node -v`
   - If version is incorrect, reinstall Node.js

2. **MongoDB Connection**
   - Ensure MongoDB is running
   - Verify your connection string in `.env`
   - Check MongoDB service status:
     - Windows: `net start MongoDB`
     - macOS: `brew services list`
     - Linux: `sudo systemctl status mongodb`

3. **Discord Bot Token**
   - Verify the token is correct
   - Ensure the bot has proper permissions
   - Check Discord Developer Portal for token validity

4. **Command Deployment**
   - If commands don't appear, try:
     ```bash
     npm run deploy-commands
     ```

5. **TypeScript Errors**
   - Run `npm run build` to check for TypeScript errors
   - Ensure all dependencies are installed correctly
   - Check tsconfig.json for correct configuration

## Support

If you encounter any issues, please:
1. Check the troubleshooting section
2. Review the error messages
3. Ensure all prerequisites are installed correctly

## Additional Resources

- [Discord.js Documentation](https://discord.js.org/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Visual Studio Code Documentation](https://code.visualstudio.com/docs) 