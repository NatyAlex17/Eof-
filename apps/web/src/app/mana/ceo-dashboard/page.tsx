'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

type Period = 'today' | 'week' | 'month';

export default function CEODashboardPage() {
  const [period, setPeriod] = useState<Period>('today');

  const bar = (pct: number, color: string) => ({
    width: `${pct}%`,
    height: '100%',
    background: color,
  });

  const periods: Array<{
    label: string;
    onClick: () => void;
    style: React.CSSProperties;
  }> = [
    ['today', 'Today'],
    ['week', 'Week'],
    ['month', 'Month'],
  ].map(([k, label]) => {
    const on = period === k;
    return {
      label: label as string,
      onClick: () => setPeriod(k as Period),
      style: {
        fontFamily: "'Archivo',sans-serif",
        fontSize: '12px',
        fontWeight: 600,
        border: 'none',
        borderRadius: '4px',
        padding: '6px 14px',
        cursor: 'pointer',
        background: on ? '#3F6F86' : 'none',
        color: on ? '#fff' : '#5A6670',
      },
    };
  });

  const warehouses = [
    {
      name: 'SFO',
      total: '524 lb · 30 bx',
      species: [
        { name: 'Ahi Tuna', lb: '246 lb', pct: 100, c: '#3F6F86' },
        { name: 'Salmon', lb: '159 lb', pct: 65, c: '#3F6F86' },
        { name: 'Ono', lb: '119 lb', pct: 48, c: '#3F6F86' },
      ],
    },
    {
      name: 'LAX',
      total: '404 lb · 24 bx',
      species: [
        { name: 'Salmon', lb: '220 lb', pct: 100, c: '#5B6670' },
        { name: 'Hamachi', lb: '96 lb', pct: 44, c: '#5B6670' },
        { name: 'Ahi Tuna', lb: '88 lb', pct: 40, c: '#5B6670' },
      ],
    },
  ].map((w) => ({
    ...w,
    species: w.species.map((sp) => ({
      ...sp,
      barStyle: bar(sp.pct, sp.c) as React.CSSProperties,
    })),
  }));

  const topRaw: Array<[string, number]> = [
    ['Nobu', 14200],
    ['Morimoto', 9800],
    ["Roy's", 7100],
    ["Alan Wong's", 5400],
    ["Tiki's Grill", 2300],
  ];
  const max = topRaw[0][1];
  const topCustomers = topRaw.map(([name, v]) => ({
    name,
    amt: '$' + v.toLocaleString('en-US'),
    barStyle: bar(Math.round((v / max) * 100), '#3F6F86') as React.CSSProperties,
  }));

  // Margin sparkline
  const data = [21, 22, 20, 24, 23, 25, 23.4];
  const w = 240;
  const h = 58;
  const min = 18;
  const maxv = 27;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (maxv - min)) * h;
    return [x, y];
  });
  const line = pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = `0,${h} ` + line + ` ${w},${h}`;

  const demand = [
    {
      name: 'Ahi Tuna',
      avg: '180 lb',
      pct: 100,
      onHand: '334 lb',
      trend: '▲ rising',
      up: true,
      rec: 'Buy 200 lb',
      recHot: true,
    },
    {
      name: 'Salmon',
      avg: '150 lb',
      pct: 83,
      onHand: '379 lb',
      trend: '– steady',
      up: null,
      rec: 'Buy 120 lb',
      recHot: false,
    },
    {
      name: 'Ono',
      avg: '90 lb',
      pct: 50,
      onHand: '119 lb',
      trend: '▲ rising',
      up: true,
      rec: 'Buy 140 lb',
      recHot: true,
    },
    {
      name: 'Hamachi',
      avg: '60 lb',
      pct: 33,
      onHand: '96 lb',
      trend: '▼ easing',
      up: false,
      rec: 'Hold',
      recHot: false,
    },
  ].map((d) => ({
    ...d,
    barStyle: bar(d.pct, '#9DAAB3') as React.CSSProperties,
    trendStyle: {
      color: d.up === true ? '#2E6347' : d.up === false ? '#8A99A3' : '#8A99A3',
    },
    recStyle:
      d.rec === 'Hold'
        ? {
            fontSize: '12px',
            fontWeight: 600,
            color: '#5A6670',
            background: '#EEF0F2',
            borderRadius: '4px',
            padding: '5px 12px',
          }
        : d.recHot
          ? {
              fontSize: '12px',
              fontWeight: 700,
              color: '#fff',
              background: '#3F6F86',
              borderRadius: '4px',
              padding: '5px 12px',
            }
          : {
              fontSize: '12px',
              fontWeight: 600,
              color: '#2D5365',
              background: '#EEF3F6',
              border: '1px solid #BBD0DB',
              borderRadius: '4px',
              padding: '5px 12px',
            },
  }));

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        background: '#F4F5F6',
        fontFamily: "'Archivo', sans-serif",
        color: '#222A30',
        WebkitFontSmoothing: 'antialiased',
        overflow: 'hidden',
      }}
    >
      <Nav />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <header
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            padding: '0 32px',
            height: '58px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              Good morning, Blake
            </span>
            <span style={{ fontSize: '12px', color: '#8A99A3' }}>
              Monday · June 23 · 06:14
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: '#F4F5F6',
              border: '1px solid #E2E6E9',
              borderRadius: '5px',
              padding: '3px',
            }}
          >
            {periods.map((p, i) => (
              <button key={i} onClick={p.onClick} style={p.style}>
                {p.label}
              </button>
            ))}
          </div>
        </header>

        <div
          className="mana-scroll"
          style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 40px' }}
        >
          <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
            {/* KPI ROW */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  padding: '20px 22px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#8A99A3',
                  }}
                >
                  REVENUE TODAY
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '30px',
                    fontWeight: 600,
                    marginTop: '10px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  $48,210
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#2E6347',
                    marginTop: '6px',
                  }}
                >
                  ▲ 12% vs daily avg
                </div>
              </div>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  padding: '20px 22px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#8A99A3',
                  }}
                >
                  GROSS MARGIN
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '30px',
                    fontWeight: 600,
                    marginTop: '10px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  23.4%
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#2E6347',
                    marginTop: '6px',
                  }}
                >
                  ▲ 1.2 pts this week
                </div>
              </div>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  padding: '20px 22px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#8A99A3',
                  }}
                >
                  BOXES SHIPPED
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '30px',
                    fontWeight: 600,
                    marginTop: '10px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  142
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '6px',
                  }}
                >
                  across SFO + LAX
                </div>
              </div>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E3B6B1',
                  borderLeft: '3px solid #C2453A',
                  borderRadius: '8px',
                  padding: '20px 22px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#A5362C',
                  }}
                >
                  OPEN SHORTAGE
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '30px',
                    fontWeight: 600,
                    marginTop: '10px',
                    letterSpacing: '-0.01em',
                    color: '#A5362C',
                  }}
                >
                  1
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#A5362C',
                    marginTop: '6px',
                  }}
                >
                  Roy's · Ono −17.4 lb
                </div>
              </div>
            </div>

            {/* MID ROW */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.55fr 1fr',
                gap: '16px',
                marginTop: '16px',
              }}
            >
              {/* inventory by warehouse + margin */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E6E9',
                    borderRadius: '8px',
                    padding: '22px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: '18px',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>
                      Inventory position by warehouse
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#8A99A3',
                      }}
                    >
                      928 lb · 54 boxes on hand
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '26px',
                    }}
                  >
                    {warehouses.map((w, i) => (
                      <div key={i}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            marginBottom: '12px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#3F6F86',
                            }}
                          >
                            {w.name}
                          </span>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '12px',
                              color: '#5A6670',
                            }}
                          >
                            {w.total}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '11px',
                          }}
                        >
                          {w.species.map((sp, j) => (
                            <div key={j}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '12px',
                                  marginBottom: '5px',
                                }}
                              >
                                <span style={{ fontWeight: 500 }}>{sp.name}</span>
                                <span
                                  style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    color: '#5A6670',
                                  }}
                                >
                                  {sp.lb}
                                </span>
                              </div>
                              <div
                                style={{
                                  height: '7px',
                                  background: '#EDEFF1',
                                  borderRadius: '2px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div style={sp.barStyle}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E6E9',
                    borderRadius: '8px',
                    padding: '22px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>
                      Margin trend
                    </span>
                    <span style={{ fontSize: '12px', color: '#8A99A3' }}>
                      Last 7 days · gross %
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '18px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '34px',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      23.4
                      <span style={{ fontSize: '16px', color: '#8A99A3' }}>
                        %
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <svg
                        viewBox={`0 0 ${w} ${h}`}
                        width="100%"
                        height={h}
                        preserveAspectRatio="none"
                        style={{ display: 'block' }}
                      >
                        <polygon points={area} fill="rgba(63,111,134,0.10)" />
                        <polyline
                          points={line}
                          fill="none"
                          stroke="#3F6F86"
                          strokeWidth={2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        <circle
                          cx={pts[pts.length - 1][0]}
                          cy={pts[pts.length - 1][1]}
                          r={3.5}
                          fill="#3F6F86"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* top customers */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E2E6E9',
                  borderRadius: '8px',
                  padding: '22px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: '18px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>
                    Top customers
                  </span>
                  <span style={{ fontSize: '12px', color: '#8A99A3' }}>
                    This week
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {topCustomers.map((c, i) => (
                    <div key={i}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>
                          {c.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          {c.amt}
                        </span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          background: '#EDEFF1',
                          borderRadius: '2px',
                          overflow: 'hidden',
                        }}
                      >
                        <div style={c.barStyle}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BUYING INTELLIGENCE */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #E2E6E9',
                borderRadius: '8px',
                padding: '22px',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 700 }}>
                  Buying intelligence
                </span>
                <span style={{ fontSize: '12px', color: '#8A99A3' }}>
                  Historical demand by species · what to order next
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 110px 110px 150px',
                  gap: 0,
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid #EDEFF1',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#8A99A3',
                }}
              >
                <span>SPECIES</span>
                <span>AVG DEMAND / DAY</span>
                <span style={{ textAlign: 'right' }}>ON HAND</span>
                <span style={{ textAlign: 'right' }}>TREND</span>
                <span style={{ textAlign: 'right' }}>RECOMMENDED</span>
              </div>
              {demand.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 110px 110px 150px',
                    gap: 0,
                    alignItems: 'center',
                    padding: '14px 0',
                    borderBottom: '1px solid #EDEFF1',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    {d.name}
                  </span>
                  <div
                    style={{
                      paddingRight: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: '8px',
                        background: '#EDEFF1',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={d.barStyle}></div>
                    </div>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#5A6670',
                        width: '54px',
                        textAlign: 'right',
                      }}
                    >
                      {d.avg}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'right',
                    }}
                  >
                    {d.onHand}
                  </span>
                  <span
                    style={{
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: 600,
                      ...d.trendStyle,
                    }}
                  >
                    {d.trend}
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span style={d.recStyle}>{d.rec}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
