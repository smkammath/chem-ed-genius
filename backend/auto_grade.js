const { embedText, cosineSim } = require("./embeddings");

/**
 * Grades on similarity of expected vs student answers.
 * Returns marks 1-5, similarity (0..1), and textual feedback.
 */
async function gradeAnswer(question, expected, studentAnswer) {
  const embExpected = await embedText(expected);
  const embStudent = await embedText(studentAnswer);
  const sim = cosineSim(embExpected, embStudent);
  let grade = 1;
  if (sim > 0.92) grade = 5;
  else if (sim > 0.85) grade = 4;
  else if (sim > 0.75) grade = 3;
  else if (sim > 0.6) grade = 2;
  else grade = 1;

  return {
    similarity: sim.toFixed(3),
    marks: grade,
    feedback:
      grade >= 4
        ? "Excellent — concept understood! 🔥"
        : grade >= 3
        ? "Good attempt, revise finer details."
        : "Needs revision — focus on key terms and equations."
  };
}

module.exports = { gradeAnswer };
