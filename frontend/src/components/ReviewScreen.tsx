import { FC, useEffect, useState } from 'react';
import { SampleDiff } from './Review/SampleDiff.tsx';
import { fetchEdit, Grade, grade, Sample } from '../lib/api.ts';

export const ReviewScreen: FC = () => {
  const [samples, setSamples] = useState<{ sample1: Sample, sample2: Sample }>({ sample1: {}, sample2: {}});

  useEffect(() => {
    fetchNextRecord();
  }, []);

  const fetchNextRecord = async () => {
    fetchEdit()
      .then(([sample1, sample2]) => {
        setSamples({ sample1, sample2 })
      });
  }

  const handleBad = async () => {
    if (!samples || !Object.keys(samples.sample2)) return;
    try {
      await grade(samples.sample2, Grade.BAD);

      await fetchNextRecord();
    } catch (err) {
      console.error('Error marking as bad:', err);
    }
  };

  const handleReject = async () => {
    if (!samples || !Object.keys(samples.sample2)) return;
    try {
      await grade(samples.sample2, Grade.REJECT);

      await fetchNextRecord();
    } catch (err) {
      console.error('Error marking as bad:', err);
    }
  };

  const handleComplete = async () => {
    if (!samples || !Object.keys(samples.sample2)) return;

    try {
      await grade(samples.sample2, Grade.DONE);
      console.log('Edits submitted successfully');
      await fetchNextRecord();
    } catch (error) {
      console.error('Error submitting edits:', error);
    }
  };

  const handleSkip = async () => {
    await fetchNextRecord();
  };

  return <>
    <h3>{samples.sample1['name']} ({samples.sample1['id']}) by {samples.sample2['editor']}</h3>
    <SampleDiff sample1={samples.sample1} sample2={samples.sample2}/>


    <div className="button-container">
      <button className="button-yellow" onClick={handleSkip}>
        Skip
      </button>
      <button className="button-red" onClick={handleBad}>
        Mark as Bad
      </button>
      <button className="button-orange" onClick={handleReject}>
        Mark as Rejected
      </button>
      <button className="button-green" onClick={handleComplete}>
        Complete
      </button>
    </div>
  </>;
};
