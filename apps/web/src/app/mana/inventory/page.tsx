'use client';

import { useState } from 'react';
import Nav from '../components/Nav';

interface Content {
  species: string;
  grade: string;
  weight: number;
}

interface Box {
  n: string;
  idx: number;
  contents: Content[];
  tag?: string;
}

interface Lot {
  lot: string;
  vendor: string;
  received: string;
  status: 'received' | 'available' | 'allocated' | 'shipped';
  boxes: Box[];
  expanded?: boolean;
}

// Column mappings per vendor (mirrors vendor_mappings table)
const VENDOR_MAPPINGS: Record<
  string,
  { box: string; weight: string; species: string; grade: string; uom: 'lb' | 'kg' }
> = {
  'Kona Fresh Catch': {
    box: 'box_id',
    weight: 'net_wt_lbs',
    species: 'product_name',
    grade: 'quality_grade',
    uom: 'lb',
  },
  'Pacific Blue Co.': {
    box: 'BoxNo',
    weight: 'Weight',
    species: 'Item',
    grade: 'Grade',
    uom: 'lb',
  },
  'Island Seafood': { box: 'BOX', weight: 'LBS', species: 'SPECIES', grade: 'GRD', uom: 'kg' },
};

// Species-code dictionary (mirrors vendor_species_codes): YF -> Yellowfin Tuna
const SPECIES_CODES: Record<string, string> = {
  YF: 'Yellowfin Tuna',
  BE: 'Bigeye Tuna',
  B: 'Bigeye Tuna',
  AHI: 'Ahi Tuna',
  ONO: 'Ono',
  SAL: 'Salmon',
  HAM: 'Hamachi',
  MAHI: 'Mahi-Mahi',
};

const KG_TO_LB = 2.20462;

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(',').map((s) => s.trim().replace(/^"|"$/g, '')))
    .filter((row) => row.some((cell) => cell.length > 0));
}

interface ParseResult {
  boxes: Box[];
  rowCount: number;
  skipped: string[];
  converted: boolean; // kg -> lb applied
}

function applyMapping(rows: string[][], vendor: string): ParseResult | { error: string } {
  const map = VENDOR_MAPPINGS[vendor];
  if (!map) return { error: 'No column mapping configured for this vendor.' };
  if (rows.length < 2) return { error: 'File has no data rows.' };
  const header = rows[0].map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const iBox = col(map.box);
  const iWeight = col(map.weight);
  const iSpecies = col(map.species);
  const iGrade = col(map.grade);
  if (iBox < 0 || iWeight < 0 || iSpecies < 0) {
    return {
      error: `Columns not found — expected "${map.box}", "${map.weight}", "${map.species}" in the header. Check Admin → Vendor Mappings.`,
    };
  }
  const byBox = new Map<string, Content[]>();
  const skipped: string[] = [];
  rows.slice(1).forEach((r, idx) => {
    const label = r[iBox];
    const rawW = parseFloat(r[iWeight]);
    const rawS = (r[iSpecies] || '').toUpperCase();
    if (!label || !rawS || !(rawW > 0)) {
      skipped.push(`Row ${idx + 2}: missing box / species / weight`);
      return;
    }
    const weight = Math.round((map.uom === 'kg' ? rawW * KG_TO_LB : rawW) * 10) / 10;
    const species = SPECIES_CODES[rawS] || r[iSpecies];
    const grade = iGrade >= 0 ? r[iGrade] || '—' : '—';
    if (!byBox.has(label)) byBox.set(label, []);
    byBox.get(label)!.push({ species, grade, weight });
  });
  const boxes: Box[] = Array.from(byBox.entries()).map(([n, contents], i) => ({
    n,
    idx: i + 1,
    contents,
  }));
  if (boxes.length === 0) return { error: 'No valid rows found in the file.' };
  return { boxes, rowCount: rows.length - 1, skipped, converted: map.uom === 'kg' };
}

interface ManualRow {
  box: string;
  species: string;
  grade: string;
  weight: string;
}

export default function InventoryPage() {
  const [filter, setFilter] = useState<'all' | 'received' | 'available' | 'allocated' | 'shipped'>(
    'all'
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'LOT-2207': true });
  const [importOpen, setImportOpen] = useState(false);
  const [importVendor, setImportVendor] = useState<string>('Kona Fresh Catch');
  const [importFileName, setImportFileName] = useState<string>('');
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string>('');
  const [addLotOpen, setAddLotOpen] = useState(false);
  const [manualLotCode, setManualLotCode] = useState('');
  const [manualVendor, setManualVendor] = useState('Kona Fresh Catch');
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { box: '', species: '', grade: 'A', weight: '' },
  ]);
  const [lotSeq, setLotSeq] = useState(2210);

  const [lotData, setLotData] = useState<Lot[]>([
    {
      lot: 'LOT-2207',
      vendor: 'Kona Fresh Catch',
      received: 'Jun 23 · 05:40',
      status: 'available',
      boxes: [
        {
          n: 'B-4471',
          idx: 1,
          tag: 'NOBU',
          contents: [{ species: 'Ahi Tuna', grade: 'A+', weight: 42.6 }],
        },
        // Vendor packed two species in one box
        {
          n: 'B-4472',
          idx: 2,
          tag: 'NOBU',
          contents: [
            { species: 'Ahi Tuna', grade: 'A+', weight: 38.1 },
            { species: 'Ono', grade: 'A', weight: 6.0 },
          ],
        },
        { n: 'B-4473', idx: 3, contents: [{ species: 'Ahi Tuna', grade: 'A+', weight: 40.2 }] },
        {
          n: 'B-4474',
          idx: 4,
          contents: [
            { species: 'Ono', grade: 'A', weight: 30.0 },
            { species: 'Ahi Tuna', grade: 'A', weight: 10.0 },
          ],
        },
        { n: 'B-4475', idx: 5, contents: [{ species: 'Ahi Tuna', grade: 'A+', weight: 39.5 }] },
        { n: 'B-4476', idx: 6, contents: [{ species: 'Ahi Tuna', grade: 'A+', weight: 41.8 }] },
      ],
    },
    {
      lot: 'LOT-2208',
      vendor: 'Pacific Blue Co.',
      received: 'Jun 23 · 05:52',
      status: 'available',
      boxes: [
        {
          n: 'B-4520',
          idx: 1,
          tag: 'MORI',
          contents: [{ species: 'Salmon', grade: 'A', weight: 31.2 }],
        },
        {
          n: 'B-4521',
          idx: 2,
          contents: [
            { species: 'Salmon', grade: 'A', weight: 33.5 },
            { species: 'Hamachi', grade: 'A+', weight: 4.0 },
          ],
        },
        { n: 'B-4522', idx: 3, contents: [{ species: 'Salmon', grade: 'A', weight: 29.8 }] },
        { n: 'B-4523', idx: 4, contents: [{ species: 'Salmon', grade: 'A', weight: 34.1 }] },
      ],
    },
    {
      lot: 'LOT-2209',
      vendor: 'Island Seafood',
      received: 'Jun 23 · 06:05',
      status: 'received',
      boxes: [
        { n: 'B-4560', idx: 1, contents: [{ species: 'Ono', grade: 'A', weight: 29.8 }] },
        {
          n: 'B-4561',
          idx: 2,
          contents: [
            { species: 'Ono', grade: 'A', weight: 20.0 },
            { species: 'Mahi-Mahi', grade: 'A', weight: 13.5 },
          ],
        },
        { n: 'B-4562', idx: 3, contents: [{ species: 'Ono', grade: 'A', weight: 26.4 }] },
      ],
    },
    {
      lot: 'LOT-2205',
      vendor: 'Kona Fresh Catch',
      received: 'Jun 22 · 06:10',
      status: 'shipped',
      boxes: [
        {
          n: 'B-4410',
          idx: 1,
          tag: 'ROY',
          contents: [{ species: 'Hamachi', grade: 'A+', weight: 22.4 }],
        },
        {
          n: 'B-4411',
          idx: 2,
          tag: 'ROY',
          contents: [{ species: 'Hamachi', grade: 'A+', weight: 24.1 }],
        },
        {
          n: 'B-4412',
          idx: 3,
          tag: 'WONG',
          contents: [{ species: 'Hamachi', grade: 'A+', weight: 23.8 }],
        },
      ],
    },
  ]);

  // --- import & manual-add handlers ---
  const nowStamp = () =>
    new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const onFilePicked = (file: File | null) => {
    setParsed(null);
    setParseError('');
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = applyMapping(parseCsv(String(reader.result || '')), importVendor);
      if ('error' in result) setParseError(result.error);
      else setParsed(result);
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!parsed) return;
    const newLot: Lot = {
      lot: `LOT-${lotSeq}`,
      vendor: importVendor,
      received: nowStamp(),
      status: 'received',
      boxes: parsed.boxes,
    };
    setLotSeq((n) => n + 1);
    setLotData((prev) => [newLot, ...prev]);
    setExpanded((prev) => ({ ...prev, [newLot.lot]: true }));
    setImportOpen(false);
    setParsed(null);
    setImportFileName('');
  };

  const addManualRow = () =>
    setManualRows((prev) => [...prev, { box: '', species: '', grade: 'A', weight: '' }]);

  const setManualRow = (i: number, patch: Partial<ManualRow>) =>
    setManualRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const removeManualRow = (i: number) => setManualRows((prev) => prev.filter((_, j) => j !== i));

  const manualValid =
    manualRows.length > 0 &&
    manualRows.every((r) => r.box && r.species && parseFloat(r.weight) > 0);

  const saveManualLot = () => {
    if (!manualValid) return;
    // rows sharing a box label become one multi-species box
    const byBox = new Map<string, Content[]>();
    manualRows.forEach((r) => {
      if (!byBox.has(r.box)) byBox.set(r.box, []);
      byBox.get(r.box)!.push({
        species: r.species,
        grade: r.grade || '—',
        weight: Math.round(parseFloat(r.weight) * 10) / 10,
      });
    });
    const newLot: Lot = {
      lot: manualLotCode || `LOT-${lotSeq}`,
      vendor: manualVendor,
      received: nowStamp(),
      status: 'received',
      boxes: Array.from(byBox.entries()).map(([n, contents], i) => ({ n, idx: i + 1, contents })),
    };
    setLotSeq((n) => n + 1);
    setLotData((prev) => [newLot, ...prev]);
    setExpanded((prev) => ({ ...prev, [newLot.lot]: true }));
    setAddLotOpen(false);
    setManualLotCode('');
    setManualRows([{ box: '', species: '', grade: 'A', weight: '' }]);
  };

  const statusMeta: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    received: { label: 'Received', color: '#8A5A14', bg: '#F4EEE2', dot: '#B7791F' },
    available: { label: 'Available', color: '#2E6347', bg: '#EAF1ED', dot: '#3F7D5B' },
    allocated: { label: 'Allocated', color: '#2D5365', bg: '#EEF3F6', dot: '#3F6F86' },
    shipped: { label: 'Shipped', color: '#5A6670', bg: '#EEF0F2', dot: '#8A99A3' },
  };

  const boxWeight = (b: Box) => b.contents.reduce((a, c) => a + c.weight, 0);
  const lotSpecies = (lot: Lot) =>
    Array.from(new Set(lot.boxes.flatMap((b) => b.contents.map((c) => c.species))));

  const filteredLots = filter === 'all' ? lotData : lotData.filter((l) => l.status === filter);

  const toggleExpanded = (lot: string) => setExpanded((prev) => ({ ...prev, [lot]: !prev[lot] }));

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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {/* HEADER */}
        <header
          style={{
            flexBasis: '58px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            padding: '0 28px',
            borderBottom: '1px solid #E2E6E9',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Lots &amp; Inventory
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '12px',
                color: '#8A99A3',
              }}
            >
              {filteredLots.reduce((a, l) => a + l.boxes.length, 0)} boxes total
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              {(['all', 'received', 'available', 'allocated', 'shipped'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    background: filter === f ? '#3F6F86' : 'none',
                    color: filter === f ? '#fff' : '#5A6670',
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAddLotOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontFamily: "'Archivo', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                background: '#fff',
                color: '#3F6F86',
                border: '1px solid #C5D8E2',
                borderRadius: '5px',
                padding: '9px 15px',
                cursor: 'pointer',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add lot
            </button>
            <button
              onClick={() => setImportOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontFamily: "'Archivo', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                background: '#222A30',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                padding: '9px 15px',
                cursor: 'pointer',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 16V4" />
                <path d="M7 9l5-5 5 5" />
                <path d="M5 20h14" />
              </svg>
              Import vendor file
            </button>
          </div>
        </header>

        {/* TABLE */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          <div
            style={{
              background: '#fff',
              border: '1px solid #E2E6E9',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* COLUMN HEAD */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '30px 128px 1fr 90px 96px 110px 132px',
                gap: 0,
                alignItems: 'center',
                padding: '11px 18px',
                borderBottom: '1px solid #E2E6E9',
                background: '#FAFBFB',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: '#8A99A3',
              }}
            >
              <span></span>
              <span>LOT</span>
              <span>SPECIES · VENDOR</span>
              <span style={{ textAlign: 'right' }}>BOXES</span>
              <span style={{ textAlign: 'right' }}>WEIGHT</span>
              <span>RECEIVED</span>
              <span>STATUS</span>
            </div>

            {/* LOT ROWS */}
            {filteredLots.map((lot) => {
              const isExpanded = !!expanded[lot.lot];
              const meta = statusMeta[lot.status];
              const totalWeight = lot.boxes.reduce((a, b) => a + boxWeight(b), 0);
              const species = lotSpecies(lot);

              return (
                <div key={lot.lot} style={{ borderBottom: '1px solid #EDEFF1' }}>
                  {/* LOT ROW */}
                  <div
                    onClick={() => toggleExpanded(lot.lot)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '30px 128px 1fr 90px 96px 110px 132px',
                      gap: 0,
                      alignItems: 'center',
                      padding: '13px 18px',
                      cursor: 'pointer',
                      background: isExpanded ? '#FAFBFB' : 'transparent',
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#FAFBFB';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isExpanded
                        ? '#FAFBFB'
                        : 'transparent';
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        color: '#8A99A3',
                        transition: 'transform 0.12s',
                        transform: `rotate(${isExpanded ? 90 : 0}deg)`,
                      }}
                    >
                      ▸
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {lot.lot}
                    </span>
                    <span
                      style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>
                        {species.length > 1 ? `Mixed · ${species.length} species` : species[0]}
                      </span>
                      {species.length > 1 && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            color: '#8A5A14',
                            background: '#F4EEE2',
                            border: '1px solid #E4D2A8',
                            borderRadius: '2px',
                            padding: '1px 6px',
                          }}
                        >
                          MIXED
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: '#8A99A3' }}> · {lot.vendor}</span>
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        textAlign: 'right',
                      }}
                    >
                      {lot.boxes.length}
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'right',
                      }}
                    >
                      {totalWeight.toFixed(1)} lb
                    </span>
                    <span
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '12px',
                        color: '#5A6670',
                      }}
                    >
                      {lot.received}
                    </span>
                    <span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: meta.color,
                          background: meta.bg,
                          borderRadius: '3px',
                          padding: '3px 9px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: meta.dot,
                          }}
                        ></span>
                        {meta.label}
                      </span>
                    </span>
                  </div>

                  {/* EXPANDED BOXES */}
                  {isExpanded && (
                    <div style={{ padding: '4px 18px 18px 48px', background: '#FAFBFB' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                          gap: '8px',
                        }}
                      >
                        {lot.boxes.map((box) => {
                          const mixed = new Set(box.contents.map((c) => c.species)).size > 1;
                          return (
                            <div
                              key={box.n}
                              style={{
                                background: '#fff',
                                border: '1px solid #E2E6E9',
                                borderLeft: `3px solid ${meta.dot}`,
                                borderRadius: '4px',
                                padding: '9px 11px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '6px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    style={{
                                      fontFamily: "'IBM Plex Mono', monospace",
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {box.n}
                                  </span>
                                  {mixed && (
                                    <span
                                      style={{
                                        fontSize: '8px',
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        color: '#8A5A14',
                                        background: '#F4EEE2',
                                        border: '1px solid #E4D2A8',
                                        borderRadius: '2px',
                                        padding: '1px 5px',
                                      }}
                                    >
                                      MIXED
                                    </span>
                                  )}
                                </div>
                                {box.tag && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      letterSpacing: '0.04em',
                                      color: '#fff',
                                      background: '#3F6F86',
                                      borderRadius: '2px',
                                      padding: '2px 6px',
                                    }}
                                  >
                                    {box.tag}
                                  </span>
                                )}
                              </div>

                              {/* species breakdown within the box */}
                              <div
                                style={{
                                  marginTop: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '5px',
                                }}
                              >
                                {box.contents.map((c, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '8px',
                                    }}
                                  >
                                    <span
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        minWidth: 0,
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: '12px',
                                          fontWeight: 500,
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        }}
                                      >
                                        {c.species}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '9px',
                                          fontWeight: 700,
                                          color: '#5A6670',
                                          border: '1px solid #D6DCE0',
                                          borderRadius: '2px',
                                          padding: '0 4px',
                                        }}
                                      >
                                        {c.grade}
                                      </span>
                                    </span>
                                    <span
                                      style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        flex: 'none',
                                      }}
                                    >
                                      {c.weight}
                                      <span
                                        style={{
                                          fontSize: '9px',
                                          color: '#8A99A3',
                                          fontWeight: 500,
                                        }}
                                      >
                                        {' '}
                                        lb
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {mixed && (
                                <div
                                  style={{
                                    marginTop: '8px',
                                    paddingTop: '7px',
                                    borderTop: '1px solid #EDEFF1',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '10px',
                                    color: '#8A99A3',
                                  }}
                                >
                                  <span>#{box.idx} · box total</span>
                                  <span
                                    style={{
                                      fontFamily: "'IBM Plex Mono', monospace",
                                      fontWeight: 600,
                                      color: '#5A6670',
                                    }}
                                  >
                                    {boxWeight(box).toFixed(1)} lb
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* IMPORT DRAWER */}
      {importOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34, 42, 48, 0.32)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 50,
          }}
          onClick={() => setImportOpen(false)}
        >
          <div
            style={{
              width: '760px',
              maxWidth: '94vw',
              height: '100%',
              background: '#F4F5F6',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-12px 0 40px rgba(34, 42, 48, 0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px',
                background: '#fff',
                borderBottom: '1px solid #E2E6E9',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                    Import vendor packing list
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '12px',
                      color: '#8A99A3',
                      marginTop: '3px',
                    }}
                  >
                    {importFileName
                      ? `${importFileName}${parsed ? ` · ${parsed.rowCount} rows · ${parsed.boxes.length} boxes` : ''}`
                      : 'CSV parsed with the vendor’s column mapping'}
                  </div>
                </div>
                <button
                  onClick={() => setImportOpen(false)}
                  style={{
                    fontSize: '20px',
                    background: 'none',
                    border: 'none',
                    color: '#8A99A3',
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
              {/* vendor + file pickers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#8A99A3',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    VENDOR (column mapping)
                  </label>
                  <select
                    value={importVendor}
                    onChange={(e) => {
                      setImportVendor(e.target.value);
                      setParsed(null);
                      setParseError('');
                      setImportFileName('');
                    }}
                    style={{
                      width: '100%',
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid #D6DCE0',
                      borderRadius: '5px',
                      padding: '9px 12px',
                      background: '#fff',
                      color: '#222A30',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {Object.keys(VENDOR_MAPPINGS).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#8A99A3',
                      marginTop: '5px',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {VENDOR_MAPPINGS[importVendor].box} · {VENDOR_MAPPINGS[importVendor].weight} ·{' '}
                    {VENDOR_MAPPINGS[importVendor].species} · {VENDOR_MAPPINGS[importVendor].uom}
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#8A99A3',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    PACKING LIST FILE (.csv)
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
                    style={{
                      width: '100%',
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '13px',
                      border: '1px dashed #C2CAD0',
                      borderRadius: '5px',
                      padding: '8px 10px',
                      background: '#fff',
                      color: '#5A6670',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {parseError && (
                <div
                  style={{
                    background: '#FBF0EF',
                    border: '1px solid #E3B6B1',
                    borderRadius: '6px',
                    padding: '12px 15px',
                    fontSize: '13px',
                    color: '#A5362C',
                    marginBottom: '14px',
                  }}
                >
                  {parseError}
                </div>
              )}

              {!parsed && !parseError && (
                <div
                  style={{
                    border: '1.5px dashed #D6DCE0',
                    borderRadius: '8px',
                    padding: '28px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#8A99A3',
                    background: '#fff',
                  }}
                >
                  Pick the vendor, then choose their CSV packing list. Rows sharing a box number are
                  grouped into one multi-species box; species codes (YF, BE…) translate via the
                  dictionary; kg converts to lb automatically.
                </div>
              )}

              {/* PREVIEW TREE — human confirms before anything is committed */}
              {parsed && (
                <div>
                  {parsed.converted && (
                    <div
                      style={{
                        background: '#F4EEE2',
                        border: '1px solid #E4D2A8',
                        borderRadius: '5px',
                        padding: '9px 13px',
                        fontSize: '12px',
                        color: '#8A5A14',
                        marginBottom: '12px',
                      }}
                    >
                      Weights converted kg → lb (this vendor ships in kg).
                    </div>
                  )}
                  {parsed.skipped.length > 0 && (
                    <div
                      style={{
                        background: '#FBF0EF',
                        border: '1px solid #E3B6B1',
                        borderRadius: '5px',
                        padding: '9px 13px',
                        fontSize: '12px',
                        color: '#A5362C',
                        marginBottom: '12px',
                      }}
                    >
                      {parsed.skipped.length} row(s) skipped:{' '}
                      {parsed.skipped.slice(0, 3).join(' · ')}
                      {parsed.skipped.length > 3 ? ' · …' : ''}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                      gap: '8px',
                    }}
                  >
                    {parsed.boxes.map((box) => {
                      const mixedBox = new Set(box.contents.map((c) => c.species)).size > 1;
                      return (
                        <div
                          key={box.n}
                          style={{
                            background: '#fff',
                            border: '1px solid #E2E6E9',
                            borderLeft: '3px solid #B7791F',
                            borderRadius: '4px',
                            padding: '9px 11px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              {box.n}
                            </span>
                            {mixedBox && (
                              <span
                                style={{
                                  fontSize: '8px',
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  color: '#8A5A14',
                                  background: '#F4EEE2',
                                  border: '1px solid #E4D2A8',
                                  borderRadius: '2px',
                                  padding: '1px 5px',
                                }}
                              >
                                MIXED
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              marginTop: '7px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            {box.contents.map((c, i) => (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  fontSize: '12px',
                                }}
                              >
                                <span
                                  style={{
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {c.species} <span style={{ color: '#8A99A3' }}>· {c.grade}</span>
                                </span>
                                <span
                                  style={{
                                    fontFamily: "'IBM Plex Mono', monospace",
                                    fontWeight: 600,
                                    flex: 'none',
                                  }}
                                >
                                  {c.weight} lb
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '16px 24px',
                background: '#fff',
                borderTop: '1px solid #E2E6E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '13px', color: '#8A99A3' }}>
                {parsed
                  ? `${parsed.boxes.length} boxes · ${parsed.boxes
                      .reduce((a, b) => a + b.contents.reduce((x, c) => x + c.weight, 0), 0)
                      .toFixed(1)} lb ready`
                  : 'Waiting for a file'}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setImportOpen(false)}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#fff',
                    color: '#5A6670',
                    border: '1px solid #D6DCE0',
                    borderRadius: '5px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmImport}
                  disabled={!parsed}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    background: parsed ? '#3F6F86' : '#E2E6E9',
                    color: parsed ? '#fff' : '#A6AEB4',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '10px 16px',
                    cursor: parsed ? 'pointer' : 'default',
                  }}
                >
                  Confirm import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD LOT DRAWER — manual entry for phone-in / corrections */}
      {addLotOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(34, 42, 48, 0.32)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 50,
          }}
          onClick={() => setAddLotOpen(false)}
        >
          <div
            style={{
              width: '640px',
              maxWidth: '94vw',
              height: '100%',
              background: '#F4F5F6',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-12px 0 40px rgba(34, 42, 48, 0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 24px',
                background: '#fff',
                borderBottom: '1px solid #E2E6E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  Add lot manually
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    color: '#8A99A3',
                    marginTop: '3px',
                  }}
                >
                  Rows sharing a box # become one multi-species box
                </div>
              </div>
              <button
                onClick={() => setAddLotOpen(false)}
                style={{
                  fontSize: '20px',
                  background: 'none',
                  border: 'none',
                  color: '#8A99A3',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#8A99A3',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    LOT CODE
                  </label>
                  <input
                    value={manualLotCode}
                    onChange={(e) => setManualLotCode(e.target.value)}
                    placeholder={`LOT-${lotSeq} (auto)`}
                    style={{
                      width: '100%',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '13px',
                      border: '1px solid #D6DCE0',
                      borderRadius: '5px',
                      padding: '9px 12px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      background: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: '#8A99A3',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    VENDOR
                  </label>
                  <select
                    value={manualVendor}
                    onChange={(e) => setManualVendor(e.target.value)}
                    style={{
                      width: '100%',
                      fontFamily: "'Archivo', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid #D6DCE0',
                      borderRadius: '5px',
                      padding: '9px 12px',
                      background: '#fff',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {Object.keys(VENDOR_MAPPINGS).map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr 70px 90px 32px',
                    gap: '8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: '#8A99A3',
                    marginBottom: '7px',
                  }}
                >
                  <span>BOX #</span>
                  <span>SPECIES</span>
                  <span>GRADE</span>
                  <span>WEIGHT LB</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {manualRows.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 1fr 70px 90px 32px',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        value={r.box}
                        onChange={(e) => setManualRow(i, { box: e.target.value })}
                        placeholder="B-4601"
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '12px',
                          border: '1px solid #D6DCE0',
                          borderRadius: '5px',
                          padding: '8px 9px',
                          outline: 'none',
                          background: '#fff',
                          minWidth: 0,
                        }}
                      />
                      <input
                        value={r.species}
                        onChange={(e) => setManualRow(i, { species: e.target.value })}
                        placeholder="Ahi Tuna"
                        style={{
                          fontFamily: "'Archivo', sans-serif",
                          fontSize: '13px',
                          border: '1px solid #D6DCE0',
                          borderRadius: '5px',
                          padding: '8px 10px',
                          outline: 'none',
                          background: '#fff',
                          minWidth: 0,
                        }}
                      />
                      <input
                        value={r.grade}
                        onChange={(e) => setManualRow(i, { grade: e.target.value })}
                        placeholder="A+"
                        style={{
                          fontFamily: "'Archivo', sans-serif",
                          fontSize: '13px',
                          border: '1px solid #D6DCE0',
                          borderRadius: '5px',
                          padding: '8px 9px',
                          outline: 'none',
                          background: '#fff',
                          minWidth: 0,
                        }}
                      />
                      <input
                        value={r.weight}
                        onChange={(e) =>
                          setManualRow(i, { weight: e.target.value.replace(/[^\d.]/g, '') })
                        }
                        placeholder="42.5"
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '13px',
                          border: '1px solid #D6DCE0',
                          borderRadius: '5px',
                          padding: '8px 9px',
                          outline: 'none',
                          background: '#fff',
                          textAlign: 'right',
                          minWidth: 0,
                        }}
                      />
                      <button
                        onClick={() => removeManualRow(i)}
                        disabled={manualRows.length === 1}
                        title="Remove row"
                        style={{
                          width: '28px',
                          height: '32px',
                          border: '1px solid #E2E6E9',
                          borderRadius: '5px',
                          background: '#fff',
                          color: manualRows.length === 1 ? '#D6DCE0' : '#8A99A3',
                          cursor: manualRows.length === 1 ? 'default' : 'pointer',
                          fontSize: '15px',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addManualRow}
                  style={{
                    marginTop: '9px',
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#3F6F86',
                    background: 'none',
                    border: '1px dashed #C5D8E2',
                    borderRadius: '5px',
                    padding: '8px 14px',
                    cursor: 'pointer',
                  }}
                >
                  + Add row (same box # = same box, extra species)
                </button>
              </div>
            </div>

            <div
              style={{
                padding: '16px 24px',
                background: '#fff',
                borderTop: '1px solid #E2E6E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '13px', color: '#8A99A3' }}>
                {manualRows.filter((r) => r.box && r.species && parseFloat(r.weight) > 0).length}{' '}
                valid row(s)
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setAddLotOpen(false)}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    background: '#fff',
                    color: '#5A6670',
                    border: '1px solid #D6DCE0',
                    borderRadius: '5px',
                    padding: '10px 16px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveManualLot}
                  disabled={!manualValid}
                  style={{
                    fontFamily: "'Archivo', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    background: manualValid ? '#222A30' : '#E2E6E9',
                    color: manualValid ? '#fff' : '#A6AEB4',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '10px 18px',
                    cursor: manualValid ? 'pointer' : 'default',
                  }}
                >
                  Save lot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
