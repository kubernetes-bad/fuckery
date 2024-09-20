import { FC, useCallback } from 'react';
import { FieldDiff } from './FieldDiff.tsx';
import { Sample } from '../../lib/api.ts';

export type SampleDiffProps = {
  sample1: Sample,
  sample2: Sample,
}

export const SampleDiff: FC<SampleDiffProps> = ({ sample1, sample2 }) => {
  const sameFields = useCallback(() => {
    if (!sample1 || !sample2) return [];
    return Object.keys(sample1)
      .filter(f => !!f)
      .map(f => `${f}`)
      .reduce((matchingKeys, key) => {
        const sample2keys = Object.keys(sample2);
        if (sample2keys.includes(key)) matchingKeys.push(key);
        return matchingKeys;
      }, [] as string[])
  }, [sample1, sample2]);

  if (!sample1 || !sample2) return <></>;

  return <>
    {sameFields().map((field) => <FieldDiff key={field} title={field} str1={`${sample1[field]}`} str2={`${sample2[field]}`}/>)}
  </>;
};
