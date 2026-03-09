import { describe, it, expect } from 'vitest';
import { autoDetectDocType } from './auto-detect-doc-type.js';

const base = 'https://learn.microsoft.com/en-us/azure/aks';

describe('autoDetectDocType', () => {
  it('detects "concept" from /concepts/ path', () => {
    expect(autoDetectDocType(`${base}/concepts/networking`)).toBe('concept');
  });

  it('detects "concept" from /concept- prefix', () => {
    expect(autoDetectDocType(`${base}/concept-taints-tolerations`)).toBe('concept');
  });

  it('detects "how-to" from /how-to/ path', () => {
    expect(autoDetectDocType(`${base}/how-to/configure-kubenet`)).toBe('how-to');
  });

  it('detects "how-to" from /howto- prefix', () => {
    expect(autoDetectDocType(`${base}/howto-deploy-java-liberty-app`)).toBe('how-to');
  });

  it('detects "quickstart"', () => {
    expect(autoDetectDocType(`${base}/quickstart-deploy-cluster`)).toBe('quickstart');
  });

  it('detects "tutorial"', () => {
    expect(autoDetectDocType(`${base}/tutorial-kubernetes-prepare-app`)).toBe('tutorial');
  });

  it('detects "best-practice"', () => {
    expect(autoDetectDocType(`${base}/best-practices-app-cluster-reliability`)).toBe('best-practice');
  });

  it('detects "troubleshooting"', () => {
    expect(autoDetectDocType(`${base}/troubleshoot-connection`)).toBe('troubleshooting');
  });

  it('detects "reference" from /reference/ path', () => {
    expect(autoDetectDocType(`${base}/reference/kubectl-cheatsheet`)).toBe('reference');
  });

  it('detects "reference" from /api/ path', () => {
    expect(autoDetectDocType(`${base}/api/managed-cluster`)).toBe('reference');
  });

  it('detects "overview" from /overview path', () => {
    expect(autoDetectDocType(`${base}/overview`)).toBe('overview');
  });

  it('detects "overview" from /intro- prefix', () => {
    expect(autoDetectDocType(`${base}/intro-kubernetes`)).toBe('overview');
  });

  it('detects "sample" from /sample path', () => {
    expect(autoDetectDocType(`${base}/sample-app`)).toBe('sample');
  });

  it('returns null for URLs with no recognized pattern', () => {
    expect(autoDetectDocType(`${base}/cluster-configuration`)).toBeNull();
  });
});
