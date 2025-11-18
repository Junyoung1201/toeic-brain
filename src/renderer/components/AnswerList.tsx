import { useSelector } from 'react-redux';
import './AnswerList.css';
import { useAppSelector } from '../store/hooks';

export default function AnswerList() {
    const answerList = useAppSelector((state) => state.ui.answerList);

    return (
        <div className='answer-field'>
            <div className='title'>답안</div>

            <div id='answerListHolder'>
                <div id='answerList'>
                    {answerList.map((answer, index) => (
                        <div key={`answer_item_${index}`}>
                            <span>{index + 1}번</span>
                            <span>{answer}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}