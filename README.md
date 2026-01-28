# Chess Tower Defense

A web-based 2D tower defense game with a chess theme, built with TypeScript, React, and PixiJS.

## Features

- Real-time 60 FPS gameplay powered by PixiJS
- Chess-themed towers and enemies
- Database-driven configuration for towers, enemies, and game settings
- Wave-based enemy spawning
- Tower upgrades and strategic placement
- Statistics and leaderboards

## Tech Stack

**Frontend:**
- React
- TypeScript
- PixiJS v8 (rendering engine)
- Zustand (state management)
- Vite (build tool)

**Backend:**
- Node.js
- Express
- TypeScript
- PostgreSQL 16

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js v24.13.0

### Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Start the services:
   ```bash
   docker-compose up -d
   ```

3. Access the game:
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:3001
   - Database: localhost:5432

## Development

See [CLAUDE.md](CLAUDE.md) for detailed development documentation.

## Credits

**Chess Piece Graphics:**
Chess piece SVG icons from [OnlineWebFonts.com](http://www.onlinewebfonts.com)
Licensed under CC BY 4.0

Attribution: Fonts made from [Web Fonts](http://www.onlinewebfonts.com) is licensed by CC BY 4.0

## License

This project is for educational and portfolio purposes.
