import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Statistics } from './Statistics';
import type { MovieLog } from '../types';

type TooltipPayloadEntry = { value: number; payload: { rating: string } };
type MockTooltipContentProps = { active?: boolean; payload?: TooltipPayloadEntry[] };

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: ({ content }: { content: React.ReactElement<MockTooltipContentProps> }) => {
    const tooltipContent = content as React.ReactElement<MockTooltipContentProps>;

    return (
      <div>
        {React.cloneElement(tooltipContent, {
          active: true,
          payload: [{ value: 1, payload: { rating: '4.5' } }],
        })}
        {React.cloneElement(tooltipContent, {
          active: true,
          payload: [{ value: 2, payload: { rating: '4.5' } }],
        })}
        {React.cloneElement(tooltipContent, { active: false, payload: [] })}
      </div>
    );
  },
}));

function renderStatistics(movieLogs: MovieLog[]) {
  return render(
    <MemoryRouter initialEntries={['/statistics']}>
      <Routes>
        <Route path="/diary" element={<div>Diary Route</div>} />
        <Route path="/statistics" element={<Statistics movieLogs={movieLogs} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Statistics', () => {
  it('displays empty state when no movies are logged', () => {
    renderStatistics([]);

    expect(screen.getByText('Total Movies')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // Most Common Rating shows '-'
    expect(screen.getByText(/No movies logged yet/i)).toBeInTheDocument();
  });

  it('displays correct total movies count', () => {
    const movieLogs: MovieLog[] = [
      { id: '1', movieName: 'Movie A', watchDate: '2026-01-01', frames: [], rating: 4 },
      { id: '2', movieName: 'Movie B', watchDate: '2026-01-02', frames: [], rating: 3.5 },
      { id: '3', movieName: 'Movie C', watchDate: '2026-01-03', frames: [] },
    ];

    renderStatistics(movieLogs);

    expect(screen.getByText('Total Movies')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calculates average rating correctly', () => {
    const movieLogs: MovieLog[] = [
      { id: '1', movieName: 'Movie A', watchDate: '2026-01-01', frames: [], rating: 4 },
      { id: '2', movieName: 'Movie B', watchDate: '2026-01-02', frames: [], rating: 5 },
      { id: '3', movieName: 'Movie C', watchDate: '2026-01-03', frames: [] },
    ];

    renderStatistics(movieLogs);

    // Average should be (4 + 5) / 2 = 4.5
    expect(screen.getAllByText('4.5 ★').length).toBeGreaterThan(0);
  });

  it('finds most common rating', () => {
    const movieLogs: MovieLog[] = [
      { id: '1', movieName: 'Movie A', watchDate: '2026-01-01', frames: [], rating: 5 },
      { id: '2', movieName: 'Movie B', watchDate: '2026-01-02', frames: [], rating: 5 },
      { id: '3', movieName: 'Movie C', watchDate: '2026-01-03', frames: [], rating: 4 },
    ];

    renderStatistics(movieLogs);

    expect(screen.getByText('5 ★')).toBeInTheDocument();
  });

  it('displays chart when movies exist', () => {
    const movieLogs: MovieLog[] = [
      { id: '1', movieName: 'Movie A', watchDate: '2026-01-01', frames: [], rating: 5 },
      { id: '2', movieName: 'Movie B', watchDate: '2026-01-02', frames: [], rating: 4 },
    ];

    renderStatistics(movieLogs);

    expect(screen.getByText('Rating Distribution')).toBeInTheDocument();
    expect(screen.getByText(/showing the distribution of ratings/i)).toBeInTheDocument();
  });

  it('navigates back to diary when Back button is clicked', async () => {
    const user = userEvent.setup();
    const movieLogs: MovieLog[] = [
      { id: '1', movieName: 'Movie A', watchDate: '2026-01-01', frames: [], rating: 4 },
    ];

    renderStatistics(movieLogs);

    await user.click(screen.getByRole('button', { name: /Back to Diary/i }));

    expect(screen.getByText('Diary Route')).toBeInTheDocument();
  });

  it('handles movies with various ratings (0.5 to 5 range)', () => {
    const movieLogs: MovieLog[] = [
      { id: '1', movieName: 'Movie A', watchDate: '2026-01-01', frames: [], rating: 0.5 },
      { id: '2', movieName: 'Movie B', watchDate: '2026-01-02', frames: [], rating: 2.5 },
      { id: '3', movieName: 'Movie C', watchDate: '2026-01-03', frames: [], rating: 5 },
      { id: '4', movieName: 'Movie D', watchDate: '2026-01-04', frames: [] },
    ];

    renderStatistics(movieLogs);

    // Average should be (0.5 + 2.5 + 5) / 3 = 2.67
    expect(screen.getByText('2.7 ★')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // total movies
  });

  it('renders tooltip labels for singular and plural movie counts', () => {
    const movieLogs: MovieLog[] = [
      { id: '1', movieName: 'Movie A', watchDate: '2026-01-01', frames: [], rating: 4.5 },
    ];

    renderStatistics(movieLogs);

    expect(screen.getByText('1 movie')).toBeInTheDocument();
    expect(screen.getByText('2 movies')).toBeInTheDocument();
  });
});


