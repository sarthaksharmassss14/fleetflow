# FleetFlow - AI Logistics Route Optimizer

A professional web platform for AI-powered logistics route optimization, designed for transportation companies to optimize delivery routes, reduce costs, and improve operational efficiency.

## 🚀 Features

- **AI Route Generation**: Uses generative AI to create optimal routes based on real-time constraints
- **Real-Time Updates**: Live traffic and weather data integration with automatic re-optimization
- **Cost Analysis**: Calculate and compare route costs including fuel, time, and tolls
- **Secure User Management**: Role-based access control (Admin, Dispatcher, Driver)
- **Interactive Maps**: Visualize routes, stops, and live updates on interactive maps
- **Exportable Schedules**: Export route plans to PDF, CSV, and iCal formats

## 🛠️ Technology Stack

- **Frontend**: React 18 with Vite
- **Styling**: CSS3 with CSS Variables
- **Build Tool**: Vite 5
- **Package Manager**: npm

## 📦 Installation

1. **Clone the repository** (or navigate to the project directory)

```bash
cd fleetflow
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the development server**

```bash
npm run dev
```

The application will start on `http://localhost:3000`

## 🏗️ Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 📁 Project Structure

```
fleetflow/
├── src/
│   ├── components/          # React components
│   │   ├── Header.jsx      # Navigation header
│   │   ├── Hero.jsx        # Hero section
│   │   ├── Features.jsx    # Features showcase
│   │   ├── HowItWorks.jsx  # Process explanation
│   │   ├── Benefits.jsx    # Benefits section
│   │   ├── Testimonials.jsx # Customer testimonials
│   │   ├── CTA.jsx         # Call-to-action section
│   │   └── Footer.jsx      # Footer component
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   ├── index.css           # Global styles
│   └── App.css             # App-specific styles
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
└── README.md               # This file
```

## 🎨 Design Features

- **Modern UI**: Clean, professional design with gradient accents
- **Responsive**: Fully responsive design that works on all devices
- **Smooth Animations**: Subtle hover effects and transitions
- **Accessible**: Semantic HTML and proper ARIA labels
- **Fast**: Optimized build with Vite for fast load times

## 🚦 Getting Started

After running `npm run dev`, you can:

- View the landing page with all sections
- Navigate through the features
- Explore the how-it-works section
- Review testimonials and benefits

## 📝 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔧 Customization

### Colors

Edit the CSS variables in `src/index.css`:

```css
:root {
  --primary-color: #0066FF;
  --secondary-color: #00D4AA;
  --text-dark: #1A1A1A;
  /* ... more variables */
}
```

### Content

Edit component files in `src/components/` to modify content, add sections, or customize layouts.

## 📄 License

This project is created for FleetFlow - AI Logistics Route Optimizer.

## 🤝 Contributing

This is a professional project for FleetFlow. For questions or support, please contact the development team.

---

Built with ❤️ for efficient logistics operations
