# Flow Chart Generator

A modern, web-based flow chart generator that converts natural language descriptions into visual diagrams. Built with TypeScript, Mermaid.js, and modern web technologies.

## Features

- 🎯 **Natural Language Input**: Describe your flow in plain English
- 🔄 **Real-time Preview**: See your diagram update as you type
- 📝 **Multiple Diagram Types**: Support for activity, sequence, and class diagrams
- 🎨 **Modern UI**: Clean, responsive interface with syntax highlighting
- ⚡ **Instant Editing**: Edit or delete any step with inline controls
- 💾 **SVG Export**: Download your diagrams as SVG files

## Getting Started

### Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/flow-chart-gen.git
cd flow-chart-gen
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:9000](http://localhost:9000) in your browser

### Building

To create a production build:
```bash
npm run build
```

## Usage Examples

1. Start a flow:
```
start with Login Screen
```

2. Add a decision:
```
if credentials valid then Dashboard else Error Message
```

3. Add a connection:
```
Dashboard leads to User Profile
```

## Technologies Used

- TypeScript
- Mermaid.js for diagram rendering
- Webpack for bundling
- Modern CSS with Grid and Flexbox
- GitHub Actions for CI/CD

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details.
