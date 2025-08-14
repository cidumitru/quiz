import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ParsedAnswer,
  ParsedQuestion,
  ParsedQuestionBank,
  questionBankScheme,
} from '../libs/data-access/src';

// Get filename from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npm run parse-questions <filename.txt>');
  process.exit(1);
}

const inputFilePath = args[0];
const absoluteInputPath = path.resolve(inputFilePath);

// Check if file exists
if (!fs.existsSync(absoluteInputPath)) {
  console.error(`File not found: ${absoluteInputPath}`);
  process.exit(1);
}

// Generate output filename (replace .txt with .json)
const outputFileName =
  path.basename(inputFilePath, path.extname(inputFilePath)) + '.json';
const outputFilePath = path.join(
  path.dirname(absoluteInputPath),
  outputFileName
);

function parseQuestionFromHtml(
  htmlContent: string,
  correctAnswerLetter: string
): ParsedQuestion {
  // Extract question text (everything before the first <br><br>)
  const questionMatch = htmlContent.match(/^(.*?)<br><br>/);
  const questionText = questionMatch ? questionMatch[1].trim() : htmlContent;

  // Extract answer options
  const answerRegex = /([A-D])\.\s*(.*?)(?=<br>|$)/g;
  const answers: ParsedAnswer[] = [];
  let match;

  while ((match = answerRegex.exec(htmlContent)) !== null) {
    const letter = match[1];
    const text = match[2].trim();

    answers.push({
      id: uuidv4(),
      text: text,
      correct: letter === correctAnswerLetter.toUpperCase(),
    });
  }

  return {
    id: uuidv4(),
    question: questionText,
    answers: answers,
  };
}

function parseQuestionsFile(filePath: string): ParsedQuestionBank {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter((line) => line.trim());

  const questions: ParsedQuestion[] = [];

  // Skip header lines
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('#')) {
      startIndex = i;
      break;
    }
  }

  // Parse each question line
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split('\t');

    if (parts.length >= 2) {
      let htmlContent = parts[0].trim();
      let correctAnswer = parts[1].trim();

      // Remove leading/trailing quotes if present
      if (htmlContent.startsWith('"') && htmlContent.endsWith('"')) {
        htmlContent = htmlContent.slice(1, -1);
      }

      // Extract just the letter from the correct answer (handle cases like "C anatomy")
      const letterMatch = correctAnswer.match(/^([A-D])/);
      if (letterMatch) {
        correctAnswer = letterMatch[1];
      }

      // Skip empty lines
      if (!htmlContent || !correctAnswer) continue;

      try {
        const question = parseQuestionFromHtml(htmlContent, correctAnswer);
        questions.push(question);
      } catch (error) {
        console.warn(`Failed to parse line ${i + 1}: ${error}`);
      }
    }
  }

  // Create question bank
  const questionBankName = path
    .basename(filePath, path.extname(filePath))
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const questionBank: ParsedQuestionBank = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    name: `${questionBankName} Questions`,
    isDeleted: false,
    questions: questions,
  };

  return questionBank;
}

// Main execution
try {
  console.log(`Parsing file: ${absoluteInputPath}`);

  const questionBank = parseQuestionsFile(absoluteInputPath);

  // Validate against schema
  const validationResult = questionBankScheme.safeParse(questionBank);

  if (!validationResult.success) {
    console.error('Validation failed:', validationResult.error.errors);
    process.exit(1);
  }

  // Write to output file
  fs.writeFileSync(outputFilePath, JSON.stringify(questionBank, null, 2));

  console.log(`Successfully parsed ${questionBank.questions.length} questions`);
  console.log(`Output saved to: ${outputFilePath}`);
} catch (error) {
  console.error('Error parsing file:', error);
  process.exit(1);
}
