# NutriAI 🥗🤖

> **Your Intelligent Personal Nutrition & Meal Planning Navigator**

NutriAI is a modern, full-stack nutrition assistant designed to help users track meals, analyze food intake, calculate personalized macros, and get real-time AI coaching to achieve their health goals. Built with speed, privacy, and seamless mobile cross-platform support in mind.

---

## 🌟 Key Features

- 🥑 **Personalized Macro Tracking**: Calculate target calories, proteins, carbs, and fats tailored to your age, weight, and fitness goals.
- 📸 **Food & Scan Logging**: Easily log meals and analyze nutritional content with AI assistance.
- 💬 **Interactive AI Health Coach**: Get instant dietary insights, recipe recommendations, and habit advice.
- 📱 **Cross-Platform Support**: Works seamlessly on Web and Android mobile devices using Capacitor.
- 🔐 **Secure Authentication**: Built-in authentication powered by Supabase Auth.
- 🎨 **Modern & Responsive UI**: Clean, accessible, and fast interface built with React, Radix UI, and Tailwind CSS.

---

## 🛠️ Tech Stack

- **Frontend / Framework**: [React](https://react.dev/), [TanStack Start](https://tanstack.com/router) & [TanStack Query](https://tanstack.com/query)
- **Mobile Engine**: [Capacitor](https://capacitorjs.com/) (Android)
- **Backend & Auth**: [Supabase](https://supabase.com/)
- **Styling**: Tailwind CSS & Radix UI Primitives
- **Icons & UI Utilities**: Lucide React, Framer Motion, Class Variance Authority

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- [Android Studio](https://developer.android.com/studio) (for running on Android devices)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Sidharth-S12/my-nutrition-navigator.git
   cd my-nutrition-navigator
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080` in your browser.

---

## 📱 Building for Mobile (Android)

To run the application on your physical Android phone or emulator:

1. **Sync Web Assets**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Run on Android Device**
   ```bash
   npx cap run android
   ```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Sidharth-S12/my-nutrition-navigator/issues).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
