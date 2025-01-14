### README

# ReactJS to ExpoJS Converter

**ReactJS to ExpoJS Converter** is a powerful tool that helps developers seamlessly transform ReactJS applications into Expo-compatible React Native apps. By automating key steps such as JSX conversion, style transformation, and updating imports, this tool saves time and ensures a smooth migration to Expo's ecosystem.

---

## Key Features
- Converts JSX elements (e.g., `<div>` to `<View>`, `<button>` to `<TouchableOpacity>`).
- Transforms CSS styles into React Native-compatible formats.
- Updates imports to align with Expo, including support for `expo-router` and `expo-font`.
- Adds TypeScript interfaces for improved type safety.
- Replaces browser-specific features like `localStorage` with Expo alternatives such as `SecureStore`.

---

## Table of Contents
1. [Requirements](#requirements)
2. [Installation](#installation)
3. [Usage](#usage)
4. [Examples](#examples)
5. [Description](#description)
6. [Key Benefits](#key-benefits)

---

## Requirements
- Node.js (v14 or higher)
- NPM or Yarn installed

---

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd <repository-directory>
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

---

## Usage

Run the script using the following command:
```bash
node index.js -i <input_file_path> -o <output_file_path>
```

### Parameters:
- **`-i`**: Path to the input ReactJS file.
- **`-o`**: Path to save the output Expo-compatible file.

---

## Examples

Convert a file named `Login.js` into an Expo-compatible TypeScript file:
```bash
node index.js -i ./example/Login.js -o ./example/login-screen2.tsx
```

---

## Description

The **ReactJS to ExpoJS Converter** simplifies the transition from ReactJS to React Native by automating key conversion tasks. It ensures compatibility with Expo's ecosystem while integrating TypeScript for enhanced code quality and maintainability.

---

## Key Benefits

- **Time-Saving**: Automates repetitive and time-consuming conversion tasks.
- **Seamless Compatibility**: Converts code to match Expo's framework requirements.
- **Enhanced Quality**: Integrates TypeScript interfaces and optimized imports.

---

## Инструкция по использованию (на русском)

### Требования
- Node.js (v14 или выше)
- Установленные NPM или Yarn

---

### Установка

1. Клонируйте репозиторий:
   ```bash
   git clone <ссылка-на-репозиторий>
   ```
2. Перейдите в папку с проектом:
   ```bash
   cd <папка-с-проектом>
   ```
3. Установите зависимости:
   ```bash
   npm install
   ```

---

### Использование

Запустите скрипт с использованием следующей команды:
```bash
node index.js -i <путь-к-исходному-файлу> -o <путь-для-результата>
```

### Параметры:
- **`-i`**: Путь к исходному ReactJS файлу.
- **`-o`**: Путь для сохранения файла, совместимого с Expo.

---

### Примеры

Для преобразования файла `Login.js` в Expo-совместимый формат:
```bash
node index.js -i ./example/Login.js -o ./example/login-screen2.tsx
```

---

## Возможности
- Преобразует JSX-элементы (например, `<div>` в `<View>`, `<button>` в `<TouchableOpacity>`).
- Трансформирует стили из CSS в формат, совместимый с React Native.
- Обновляет импорты для работы с Expo, включая поддержку `expo-router` и `expo-font`.
- Добавляет TypeScript-интерфейсы для улучшенной типизации.
- Заменяет браузерные функции, такие как `localStorage`, на аналоги Expo (`SecureStore`).
