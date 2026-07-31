# NutriAI Companion

Build a production-ready Flutter application called NutriAI.

IMPORTANT

Do NOT generate a generic AI-looking Flutter application.

Do NOT use the typical oversized rounded cards.

Do NOT use unnecessary gradients.

Do NOT create a Dribbble concept.

Do NOT generate placeholder dashboards.

Design this application as if it will be published on the Google Play Store and used by real users every day.

The UI must prioritize usability over visual effects.

----------------------------------------------------

TECH STACK

----------------------------------------------------

Flutter (latest stable)

Material 3

GoRouter

Firebase Authentication

Cloud Firestore

Firebase Storage

SharedPreferences

Gemini API

Gemini Vision API

Provider (or Riverpod if necessary)

Feature-first architecture.

----------------------------------------------------

FOLDER STRUCTURE

----------------------------------------------------

lib/

config/

core/

models/

services/

shared/

widgets/

features/

home/

scan/

diet/

coach/

progress/

profile/

navigation/

----------------------------------------------------

BOTTOM NAVIGATION

----------------------------------------------------

Exactly five tabs.

Home

Scan

Diet

Progress

Profile

The AI Coach should NOT occupy a bottom navigation tab.

Instead, AI should be integrated naturally inside Home, Scan and Diet.

----------------------------------------------------

DESIGN LANGUAGE

----------------------------------------------------

Minimal.

Modern.

Professional.

Human-friendly.

Compact.

No oversized cards.

No excessive white space.

No glassmorphism.

No neumorphism.

No heavy gradients.

No rainbow colors.

The application should feel inspired by

Apple Health

Google Fit

Fitbit

MyFitnessPal

Cronometer

ChatGPT Mobile

Material 3 should be customized and should not resemble a default Flutter template.

----------------------------------------------------

HOME SCREEN

----------------------------------------------------

Display

Good Morning + User Name

Current Date

Profile Photo

Notification Icon

Today's Summary

Calories Consumed

Calories Remaining

Daily Goal

Circular Progress Indicator

Nutrition

Protein

Carbs

Fat

Horizontal progress indicators.

Water Intake

Simple progress indicator.

Quick Add button.

Today's Meals

Breakfast

Lunch

Dinner

Snacks

Each row should display

Meal Name

Food Summary

Calories

Chevron

Quick Actions

Scan Food

Generate Diet

History

AI Coach

Displayed in a clean grid.

Daily Nutrition Tip

Small information section.

----------------------------------------------------

SCAN FOOD

----------------------------------------------------

Camera

Gallery

Recent Scans

After image upload

Gemini Vision identifies foods.

Display

Food Name

Confidence

Calories

Protein

Carbs

Fat

Save Meal button.

----------------------------------------------------

DIET PLANNER

----------------------------------------------------

Collect

Age

Gender

Height

Weight

Goal

Activity Level

Food Preference

Allergies

Generate an AI diet plan.

Display meals chronologically.

Breakfast

Morning Snack

Lunch

Evening Snack

Dinner

Each meal shows

Foods

Calories

Macros

Buttons

Save Plan

Regenerate Meal

Export PDF

----------------------------------------------------

AI COACH

----------------------------------------------------

Professional chat interface.

Looks similar to ChatGPT Mobile.

Suggested questions.

Voice input.

Image upload.

Conversation history.

Streaming responses.

----------------------------------------------------

PROGRESS

----------------------------------------------------

Weekly Calories

Monthly Calories

Weight Trend

BMI

Protein Average

Water Intake

Daily Streak

Minimal charts.

----------------------------------------------------

PROFILE

----------------------------------------------------

Profile Photo

Name

Email

Age

Height

Weight

Goal

Medical Conditions

Settings

Privacy

Logout

----------------------------------------------------

FUNCTIONAL REQUIREMENTS

----------------------------------------------------

Do NOT hardcode dashboard values.

Every displayed value must be connected to a service layer.

Design models for

User

Meal

Nutrition

Water

Diet Plan

Progress

All services should be ready for Firebase integration.

Separate UI, business logic and services.

Avoid duplicate code.

Create reusable widgets.

Use proper state management.

Prepare the application for production deployment.

----------------------------------------------------

USER EXPERIENCE

----------------------------------------------------

Every interaction should feel fast.

Support dark mode.

Support offline caching where appropriate.

Responsive on Android.

Loading states.

Empty states.

Error handling.

Smooth animations.

----------------------------------------------------

GOAL

----------------------------------------------------

Generate a production-ready Flutter application that looks and behaves like a commercial health application rather than an AI-generated college project.

build a app

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://my-nutrition-navigator.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/91a1e02d-71fc-40a8-a407-ec46f2c4deb6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
