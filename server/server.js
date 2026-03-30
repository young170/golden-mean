import express from "express";
import cors from "cors";
const app = express();

app.use(cors());
app.use(express.json());

// Mock Database of Questions
const questions = [
  { id: 0, x: "much", y: "Coffee", unit: "cups", min: 0, max: 20 },
  { id: 1, x: "fast", y: "Driving", unit: "mph", min: 0, max: 120 },
  { id: 2, x: "late", y: "Staying Up", unit: "am", min: 0, max: 5 },
];

// Mock Store for Votes: { questionId: [val1, val2, ...] }
let votes = { 0: [3, 5, 4, 8], 1: [65, 70, 80], 2: [11, 12, 1] };

// Helper: Get question based on date
const getQuestionIndex = (offset = 0) => {
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return (dayOfYear + offset) % questions.length;
};

app.get("/api/today", (req, res) => {
  const currentIndex = getQuestionIndex();
  const nextIndex = getQuestionIndex(1);

  const currentVotes = votes[currentIndex] || [];
  const stats =
    currentVotes.length > 0
      ? {
          average: (
            currentVotes.reduce((a, b) => a + b, 0) / currentVotes.length
          ).toFixed(1),
          median: currentVotes.sort((a, b) => a - b)[
            Math.floor(currentVotes.length / 2)
          ],
          min: Math.min(...currentVotes),
          max: Math.max(...currentVotes),
          count: currentVotes.length,
        }
      : null;

  res.json({
    today: questions[currentIndex],
    tomorrow: questions[nextIndex].y,
    stats,
    votes: votes[currentIndex],
  });
});

app.post("/api/submit", (req, res) => {
  const { questionId, value } = req.body;
  if (!votes[questionId]) votes[questionId] = [];
  votes[questionId].push(Number(value));
  res.sendStatus(200);
});

app.listen(5000, () => console.log("Server running on port 5000"));
