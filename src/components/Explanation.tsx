import type { Question } from '../types'

interface Props {
  question: Pick<Question, 'tldr' | 'explanationHtml'>
}

export default function Explanation({ question }: Props) {
  return (
    <div className="feedback-explanation">
      {question.tldr && (
        <p className="explanation-tldr">
          <span className="explanation-tldr-label">TL;DR</span>
          {question.tldr}
        </p>
      )}
      <div dangerouslySetInnerHTML={{ __html: question.explanationHtml }} />
    </div>
  )
}
