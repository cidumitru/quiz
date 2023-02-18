# Angular Quiz Generator
This project provides a solution written in Angular for generating quizzes based on user-created question banks. It allows users to create and manage their own question banks, and then use those banks to generate quizzes that can be taken online. The project provides a user-friendly interface for creating, editing, and deleting questions and question banks, as well as generating quizzes with custom settings and options.

DEMO: <https://cidumitru.github.io/quiz/#/>

Features
--------

-   Create, edit, and delete question banks
-   Add and remove questions from question banks
-   Generate quizzes based on your question banks
-   Allow users to take quizzes online and receive immediate feedback on their performance
-   Uses localforage as a persistence layer, allowing users to save their question banks and quizzes locally

Installation
------------

To use this project, you will need to have the following installed:

-   Node.js
-   Angular CLI

You can install Node.js from <https://nodejs.org/>, and Angular CLI using the following command:


`npm install -g @angular/cli`

To install the project, clone the repository and run the following commands in the project directory:
```
npm install
ng serve
```

You can then access the project in your browser at <http://localhost:4200/>.

Usage
-----

To use the project, simply access the project in your browser at http://localhost:4200/. From there, you can create and manage your own question banks, add and remove questions from those banks, and generate quizzes based on the question banks you have created.

When generating a quiz, you can customize various settings, such as the number of questions. You can then take the quiz online and receive immediate feedback on your performance.

Contributing
------------

If you would like to contribute to this project, please fork the repository and submit a pull request with your changes. Before submitting a pull request, please make sure to run the tests and ensure that your changes do not break any existing functionality.
