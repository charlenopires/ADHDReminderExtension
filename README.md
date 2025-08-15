# ADHD Reminder Chrome Extension

A modern, beautiful Chrome extension designed specifically for people with ADHD to help manage tasks and stay organized. Features a clean dark interface with colorful accents and an intuitive task management system.

## 🌟 Features

### ✨ **Modern Dark UI**
- Beautiful dark theme with gradient accents
- Smooth animations and hover effects
- Responsive design that works on all screen sizes
- Clean, distraction-free interface

### 📋 **Task Management**
- **Current Project**: Keep track of your main focus
- **3-Day Planning**: Organize tasks for Today, Tomorrow, and Day After Tomorrow
- **Quick Add**: Add tasks with Enter key or click
- **Easy Remove**: Delete tasks with a single click
- **Auto-Save**: Your data is automatically saved

### 🎯 **ADHD-Friendly Design**
- **Visual Organization**: Color-coded sections for easy recognition
- **Timeline View**: Visual timeline with colored dots for each task
- **Privacy Mode**: Hide/show project name with eye toggle
- **Minimal Distractions**: Clean interface keeps you focused

### 🔄 **Smart Integration**
- **New Tab Override**: See your tasks every time you open a new tab
- **Popup Access**: Quick access via extension icon
- **IndexedDB Storage**: Advanced local database storage for better performance
- **Real-time Sync**: Changes sync between popup and new tab instantly
- **Offline Support**: Works completely offline with local data storage

## 📸 Screenshots

### Popup Interface
The extension popup provides a compact interface for managing your tasks:
- Current project input at the top
- Three sections for different days
- Color-coded icons for easy identification
- Quick add buttons and task removal

### New Tab Dashboard
Every new tab shows your organized tasks:
- Prominent current project display with privacy toggle
- Three-column layout for different days
- Beautiful timeline visualization
- Hover effects and smooth animations

## 🚀 Installation

### From Chrome Web Store
*Coming soon - extension will be available on the Chrome Web Store*

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your toolbar

## 💡 How to Use

### Getting Started
1. Click the extension icon in your Chrome toolbar
2. Enter your current project name
3. Add tasks for today, tomorrow, and the day after tomorrow
4. Click "Save All" to store your data

### Managing Tasks
- **Add Task**: Type in the input field and press Enter or click the + button
- **Remove Task**: Click the × button next to any task
- **View Tasks**: Open a new tab to see your organized task dashboard
- **Hide Project**: Click the eye icon to hide/show your project name

### Tips for ADHD Users
- **Start Small**: Add just 2-3 tasks per day to avoid overwhelm
- **Be Specific**: Write clear, actionable tasks
- **Use Colors**: The color coding helps with visual organization
- **Check Regularly**: New tabs will remind you of your tasks
- **Update Daily**: Review and update your tasks each morning

## 🛠️ Technical Details

### Built With
- **HTML5** - Structure and layout
- **CSS3** - Modern styling with gradients and animations
- **JavaScript** - Task management and Chrome API integration
- **IndexedDB** - Advanced client-side database for task storage
- **Chrome Extension API** - Storage and new tab override
- **Font Awesome** - Beautiful icons
- **Inter Font** - Clean, readable typography

### File Structure
```
├── manifest.json          # Extension configuration
├── db.js                  # IndexedDB database manager
├── popup.html             # Popup interface
├── popup.js              # Popup functionality
├── newtab.html           # New tab dashboard
├── newtab.js             # New tab functionality
├── icons/                # Extension icons
│   ├── reminder-icon16.png
│   ├── reminder-icon48.png
│   └── reminder-icon128.png
└── README.md             # This file
```

### Permissions
- **Storage**: To save your tasks and project data locally (fallback)
- **IndexedDB**: Advanced local database for better performance and reliability
- **New Tab Override**: To display your tasks on new tabs

## 🎨 Design Philosophy

This extension was designed with ADHD users in mind:

- **Reduced Cognitive Load**: Simple, clear interface without clutter
- **Visual Hierarchy**: Color coding and typography guide attention
- **Immediate Feedback**: Smooth animations provide satisfying interactions
- **Consistent Layout**: Familiar patterns reduce mental effort
- **Privacy Conscious**: Option to hide sensitive project information

## 🔧 Customization

The extension uses CSS custom properties for easy theming. Key colors:
- **Primary**: `#4ecdc4` (Teal)
- **Secondary**: `#45b7d1` (Blue)
- **Accent**: `#96ceb4` (Green)
- **Warning**: `#ff6b6b` (Red)

## 📱 Browser Compatibility

- **Chrome**: Fully supported (Manifest V3)
- **Edge**: Compatible with Chromium-based Edge
- **Other Browsers**: May work with Chromium-based browsers

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: Open an issue with details about the problem
2. **Suggest Features**: Share ideas for ADHD-friendly improvements
3. **Submit Pull Requests**: Fix bugs or add new features
4. **Improve Documentation**: Help make the README clearer

### Development Setup
1. Clone the repository
2. Make your changes
3. Test in Chrome developer mode
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Designed for the ADHD community
- Inspired by modern task management principles
- Built with accessibility and usability in mind

## 📞 Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the troubleshooting section below

### Troubleshooting

**Tasks not saving?**
- Make sure you click "Save All" in the popup
- Check if Chrome storage permissions are enabled

**New tab not showing tasks?**
- Refresh the extension in chrome://extensions/
- Make sure the extension is enabled

**Interface looks broken?**
- Try disabling other extensions that might conflict
- Clear Chrome cache and reload the extension

---

**Made with ❤️ for the ADHD community**

*This extension aims to make task management easier and more enjoyable for people with ADHD. Your feedback helps us improve!*