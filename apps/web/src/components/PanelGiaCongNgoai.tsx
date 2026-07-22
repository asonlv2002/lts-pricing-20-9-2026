'use client';

import React from 'react';
import type {
  CalculateInput,
  OutsourceConfig,
  OutsourceLayerConfig,
  OutsourceFilmSource,
  OutsourceStep,
} from '../lib/types';

const CD_OPTIONS: { key: OutsourceStep; label: string }[] = [
  { key: 'print', label: 'In' },
  { key: 'laminate', label: 'Ghép' },
  { key: 'slit', label: 'Chia' },
  { key: 'bag', label: 'Làm túi' },
  { key: 'handle', label: 'Gắn quai' },
  { key: 'pp_bag', label: 'Làm bao PP' },
];

const STEP_LABEL: Record<OutsourceStep, string> = {
  print: 'In',
  laminate: 'Ghép',
  slit: 'Chia',
  bag: 'Làm túi',
  handle: 'Gắn quai',
  pp_bag: 'Làm bao PP',
};

function Hang3({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="outsource-grid-3" style={style}>
      {children}
    </div>
  );
}

function OSo(props: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="form-group outsource-field" style={{ marginBottom: 8 }}>
      <label className="form-label outsource-field-label">
        {props.label}{props.suffix ? ` (${props.suffix})` : ''}
      </label>
      <input
        className="form-input outsource-field-input"
        type="number"
        value={props.value ?? ''}
        onChange={e => props.onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function NguonMangSelect(props: {
  value: OutsourceFilmSource;
  onChange: (v: OutsourceFilmSource) => void;
}) {
  return (
    <select
      className="form-select"
      value={props.value}
      onChange={e => props.onChange(e.target.value as OutsourceFilmSource)}
      style={{ width: 'auto', minWidth: 160, maxWidth: '46%', fontSize: '0.78rem' }}
    >
      <option value="lts">Màng của LTS</option>
      <option value="vendor">Màng bên gia công</option>
    </select>
  );
}

function HangTitleCoNguon(props: {
  label: string;
  filmSource: OutsourceFilmSource;
  onFilmSource: (v: OutsourceFilmSource) => void;
  indent?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 8,
        flexWrap: 'wrap',
        paddingLeft: props.indent ? 14 : 0,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
        {props.label}
      </div>
      <NguonMangSelect value={props.filmSource} onChange={props.onFilmSource} />
    </div>
  );
}

function FieldsTheoNguon(props: {
  cfg: OutsourceLayerConfig;
  onChange: (cfg: OutsourceLayerConfig) => void;
  gcSuffix?: string;
}) {
  const isVendor = props.cfg.filmSource === 'vendor';
  if (isVendor) {
    return (
      <OSo
        label="Giá mua màng"
        suffix="đ/m²"
        value={props.cfg.filmBuyPricePerM2}
        onChange={v => props.onChange({ ...props.cfg, filmBuyPricePerM2: v })}
      />
    );
  }
  return (
    <Hang3 style={{ marginBottom: 4 }}>
      <OSo label="% phi hao" value={props.cfg.wastePct} onChange={v => props.onChange({ ...props.cfg, wastePct: v })} />
      <OSo label="PH setup" suffix="m" value={props.cfg.wasteSetupM} onChange={v => props.onChange({ ...props.cfg, wasteSetupM: v })} />
      <OSo
        label="Giá GC"
        suffix={props.gcSuffix ?? 'đ/m²'}
        value={props.cfg.gcPricePerM2}
        onChange={v => props.onChange({ ...props.cfg, gcPricePerM2: v })}
      />
    </Hang3>
  );
}

function PhuPhiCd(props: {
  shippingVnd?: number;
  packagingVnd?: number;
  otherVnd?: number;
  onChange: (patch: { shippingVnd?: number; packagingVnd?: number; otherVnd?: number }) => void;
}) {
  return (
    <Hang3 style={{ marginTop: 8, marginBottom: 4 }}>
      <OSo
        label="Vận chuyển"
        suffix="đ"
        value={props.shippingVnd}
        onChange={v => props.onChange({ shippingVnd: v, packagingVnd: props.packagingVnd, otherVnd: props.otherVnd })}
      />
      <OSo
        label="Đóng gói"
        suffix="đ"
        value={props.packagingVnd}
        onChange={v => props.onChange({ shippingVnd: props.shippingVnd, packagingVnd: v, otherVnd: props.otherVnd })}
      />
      <OSo
        label="Phụ phí khác"
        suffix="đ"
        value={props.otherVnd}
        onChange={v => props.onChange({ shippingVnd: props.shippingVnd, packagingVnd: props.packagingVnd, otherVnd: v })}
      />
    </Hang3>
  );
}

function TitleCd({ label }: { label: string }) {
  return (
    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>
      {label}
    </div>
  );
}

/** Chi tiết GC — gồm chọn công đoạn + form; dưới Cấu trúc, trên Tùy chỉnh nâng cao */
export function ChiTietGiaCongNgoai(props: {
  input: CalculateInput;
  onChange: (partial: Partial<CalculateInput>) => void;
  anTieuDe?: boolean;
}) {
  const { input, onChange, anTieuDe } = props;
  if (input.pricingMode !== 'outsource') return null;

  const out: OutsourceConfig = input.outsource ?? { steps: [] };
  const steps = out.steps;

  const toggle = (key: OutsourceStep) => {
    const next = steps.includes(key) ? steps.filter(s => s !== key) : [...steps, key];
    onChange({ outsource: { ...out, steps: next } });
  };

  const patchOut = (partial: Partial<OutsourceConfig>) => {
    onChange({ outsource: { ...out, ...partial } });
  };
  const bagBase = {
    wastePct: out.bag?.wastePct ?? 0,
    wasteSetupM: out.bag?.wasteSetupM ?? 0,
    gcPricePerBag: out.bag?.gcPricePerBag ?? 0,
    zipperMode: out.bag?.zipperMode,
    zipperPricePerM: out.bag?.zipperPricePerM,
    tapeMode: out.bag?.tapeMode,
    tapePricePerM: out.bag?.tapePricePerM,
    shippingVnd: out.bag?.shippingVnd,
    packagingVnd: out.bag?.packagingVnd,
    otherVnd: out.bag?.otherVnd,
  };

  const layerKeys = (
    [
      ['layer2', input.layer2Id, 'Lớp 2'],
      ['layer3', input.layer3Id, 'Lớp 3'],
      ['layer4', input.layer4Id, 'Lớp 4'],
      ['layer5', input.layer5Id, 'Lớp 5'],
    ] as const
  ).filter(([, id]) => !!id);

  return (
    <div className="outsource-panel" style={{ display: 'flex', flexDirection: 'column', marginTop: anTieuDe ? 0 : 4, marginBottom: 8, minWidth: 0 }}>
      {!anTieuDe && (
        <div className="card-title" style={{ fontSize: '0.78rem', marginBottom: 12 }}>
          <span className="icon">🔧</span> Chi tiết gia công ngoài
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: steps.length ? 14 : 4 }}>
        {CD_OPTIONS.map(cd => {
          const on = steps.includes(cd.key);
          return (
            <label
              key={cd.key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 8,
                border: on ? '1px solid rgba(220,38,38,0.45)' : '1px solid var(--border)',
                background: on ? 'rgba(220,38,38,0.06)' : 'var(--surface)',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: on ? 650 : 500,
              }}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(cd.key)} />
              {cd.label}
            </label>
          );
        })}
      </div>
      {steps.length === 0 && (
        <div style={{ marginTop: 2, marginBottom: 4, fontSize: '0.75rem', color: '#dc2626' }}>
          Chọn ít nhất 1 công đoạn
        </div>
      )}

      {steps.includes('bag') && (
        <div style={{ order: 4, marginBottom: 16 }}>
          <TitleCd label={STEP_LABEL.bag} />
          <Hang3>
            <OSo
              label="% phi hao"
              value={out.bag?.wastePct}
              onChange={v =>
                patchOut({
                  bag: {
                    ...bagBase,
                    wastePct: v,
                  },
                })
              }
            />
            <OSo
              label="PH setup"
              suffix="m"
              value={out.bag?.wasteSetupM}
              onChange={v =>
                patchOut({
                  bag: {
                    ...bagBase,
                    wasteSetupM: v,
                  },
                })
              }
            />
            <OSo
              label="Giá GC"
              suffix="đ/túi"
              value={out.bag?.gcPricePerBag}
              onChange={v =>
                patchOut({
                  bag: {
                    ...bagBase,
                    gcPricePerBag: v,
                  },
                })
              }
            />
          </Hang3>
          {input.hasZipper && (
            <>
              <div className="form-group">
                <label className="form-label">Zipper</label>
                <select
                  className="form-select"
                  value={out.bag?.zipperMode === 'included' ? 'included' : 'excluded'}
                  onChange={e =>
                    patchOut({
                      bag: {
                        ...bagBase,
                        zipperMode: e.target.value as 'included' | 'excluded',
                      },
                    })
                  }
                >
                  <option value="included">GC đã gồm phí zipper</option>
                  <option value="excluded">GC chưa gồm — nhập giá zipper</option>
                </select>
              </div>
              {out.bag?.zipperMode !== 'included' && (
                <OSo
                  label="Giá zipper"
                  suffix="VNĐ/m"
                  value={out.bag?.zipperPricePerM}
                  onChange={v =>
                    patchOut({
                      bag: {
                        ...bagBase,
                        zipperMode: 'excluded',
                        zipperPricePerM: v,
                      },
                    })
                  }
                />
              )}
            </>
          )}
          {input.hasTape && (
            <>
              <div className="form-group">
                <label className="form-label">Băng keo</label>
                <select
                  className="form-select"
                  value={out.bag?.tapeMode === 'included' ? 'included' : 'excluded'}
                  onChange={e =>
                    patchOut({
                      bag: {
                        ...bagBase,
                        tapeMode: e.target.value as 'included' | 'excluded',
                      },
                    })
                  }
                >
                  <option value="included">GC đã gồm phí băng keo</option>
                  <option value="excluded">GC chưa gồm — nhập giá băng keo</option>
                </select>
              </div>
              {out.bag?.tapeMode !== 'included' && (
                <OSo
                  label="Giá băng keo"
                  suffix="VNĐ/m"
                  value={out.bag?.tapePricePerM}
                  onChange={v =>
                    patchOut({
                      bag: {
                        ...bagBase,
                        tapeMode: 'excluded',
                        tapePricePerM: v,
                      },
                    })
                  }
                />
              )}
            </>
          )}
          <PhuPhiCd
            shippingVnd={out.bag?.shippingVnd}
            packagingVnd={out.bag?.packagingVnd}
            otherVnd={out.bag?.otherVnd}
            onChange={fees =>
              patchOut({
                bag: {
                  ...bagBase,
                  ...fees,
                },
              })
            }
          />
        </div>
      )}

      {steps.includes('handle') && (
        <div style={{ order: 5, marginBottom: 16 }}>
          <TitleCd label={STEP_LABEL.handle} />
          <Hang3>
            <OSo
              label="% phi hao"
              value={out.handle?.wastePct}
              onChange={v =>
                patchOut({
                  handle: {
                    wastePct: v,
                    gcPricePerBag: out.handle?.gcPricePerBag ?? 0,
                    handleUnitPrice: out.handle?.handleUnitPrice ?? 0,
                  },
                })
              }
            />
            <OSo
              label="Giá GC / túi"
              value={out.handle?.gcPricePerBag}
              onChange={v =>
                patchOut({
                  handle: {
                    wastePct: out.handle?.wastePct ?? 0,
                    gcPricePerBag: v,
                    handleUnitPrice: out.handle?.handleUnitPrice ?? 0,
                  },
                })
              }
            />
            <OSo
              label="Giá quai / túi"
              value={out.handle?.handleUnitPrice}
              onChange={v =>
                patchOut({
                  handle: {
                    wastePct: out.handle?.wastePct ?? 0,
                    gcPricePerBag: out.handle?.gcPricePerBag ?? 0,
                    handleUnitPrice: v,
                  },
                })
              }
            />
          </Hang3>
          <PhuPhiCd
            shippingVnd={out.handle?.shippingVnd}
            packagingVnd={out.handle?.packagingVnd}
            otherVnd={out.handle?.otherVnd}
            onChange={fees =>
              patchOut({
                handle: {
                  wastePct: out.handle?.wastePct ?? 0,
                  gcPricePerBag: out.handle?.gcPricePerBag ?? 0,
                  handleUnitPrice: out.handle?.handleUnitPrice ?? 0,
                  ...fees,
                },
              })
            }
          />
        </div>
      )}

      {steps.includes('pp_bag') && (
        <div style={{ order: 6, marginBottom: 16 }}>
          <TitleCd label={STEP_LABEL.pp_bag} />
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label">Biến thể</label>
            <select
              className="form-select"
              value={out.pp_bag?.variant ?? 'pp'}
              onChange={e =>
                patchOut({
                  pp_bag: {
                    variant: e.target.value as 'pp' | 'pp_pe',
                    wastePct: out.pp_bag?.wastePct ?? 0,
                    wasteSetupM: out.pp_bag?.wasteSetupM ?? 0,
                    gcPricePerUnit: out.pp_bag?.gcPricePerUnit ?? 0,
                    ppMaterialPricePerUnit: out.pp_bag?.ppMaterialPricePerUnit,
                  },
                })
              }
            >
              <option value="pp">Bao PP</option>
              <option value="pp_pe">Bao PP lót PE</option>
            </select>
          </div>
          <Hang3>
            <OSo
              label="% phi hao"
              value={out.pp_bag?.wastePct}
              onChange={v =>
                patchOut({
                  pp_bag: {
                    variant: out.pp_bag?.variant ?? 'pp',
                    wastePct: v,
                    wasteSetupM: out.pp_bag?.wasteSetupM ?? 0,
                    gcPricePerUnit: out.pp_bag?.gcPricePerUnit ?? 0,
                    ppMaterialPricePerUnit: out.pp_bag?.ppMaterialPricePerUnit,
                  },
                })
              }
            />
            <OSo
              label="PH setup"
              suffix="m"
              value={out.pp_bag?.wasteSetupM}
              onChange={v =>
                patchOut({
                  pp_bag: {
                    variant: out.pp_bag?.variant ?? 'pp',
                    wastePct: out.pp_bag?.wastePct ?? 0,
                    wasteSetupM: v,
                    gcPricePerUnit: out.pp_bag?.gcPricePerUnit ?? 0,
                    ppMaterialPricePerUnit: out.pp_bag?.ppMaterialPricePerUnit,
                  },
                })
              }
            />
            <OSo
              label="Giá GC / cái"
              value={out.pp_bag?.gcPricePerUnit}
              onChange={v =>
                patchOut({
                  pp_bag: {
                    variant: out.pp_bag?.variant ?? 'pp',
                    wastePct: out.pp_bag?.wastePct ?? 0,
                    wasteSetupM: out.pp_bag?.wasteSetupM ?? 0,
                    gcPricePerUnit: v,
                    ppMaterialPricePerUnit: out.pp_bag?.ppMaterialPricePerUnit,
                  },
                })
              }
            />
          </Hang3>
          <OSo
            label="Vật tư PP / cái"
            value={out.pp_bag?.ppMaterialPricePerUnit}
            onChange={v =>
              patchOut({
                pp_bag: {
                  variant: out.pp_bag?.variant ?? 'pp',
                  wastePct: out.pp_bag?.wastePct ?? 0,
                  wasteSetupM: out.pp_bag?.wasteSetupM ?? 0,
                  gcPricePerUnit: out.pp_bag?.gcPricePerUnit ?? 0,
                  ppMaterialPricePerUnit: v,
                },
              })
            }
          />
          <PhuPhiCd
            shippingVnd={out.pp_bag?.shippingVnd}
            packagingVnd={out.pp_bag?.packagingVnd}
            otherVnd={out.pp_bag?.otherVnd}
            onChange={fees => patchOut({ pp_bag: { variant: out.pp_bag?.variant ?? 'pp', wastePct: out.pp_bag?.wastePct ?? 0, wasteSetupM: out.pp_bag?.wasteSetupM ?? 0, gcPricePerUnit: out.pp_bag?.gcPricePerUnit ?? 0, ppMaterialPricePerUnit: out.pp_bag?.ppMaterialPricePerUnit, ...fees } })}
          />
        </div>
      )}

      {steps.includes('slit') && (
        <div style={{ order: 3, marginBottom: 16 }}>
          <TitleCd label={STEP_LABEL.slit} />
          <Hang3>
            <OSo
              label="% phi hao"
              value={out.slit?.wastePct}
              onChange={v =>
                patchOut({
                  slit: {
                    wastePct: v,
                    wasteSetupM: out.slit?.wasteSetupM ?? 0,
                    gcPricePerM2: out.slit?.gcPricePerM2 ?? 0,
                  },
                })
              }
            />
            <OSo
              label="PH setup"
              suffix="m"
              value={out.slit?.wasteSetupM}
              onChange={v =>
                patchOut({
                  slit: {
                    wastePct: out.slit?.wastePct ?? 0,
                    wasteSetupM: v,
                    gcPricePerM2: out.slit?.gcPricePerM2 ?? 0,
                  },
                })
              }
            />
            <OSo
              label="Giá GC"
              suffix="đ/m²"
              value={out.slit?.gcPricePerM2}
              onChange={v =>
                patchOut({
                  slit: {
                    wastePct: out.slit?.wastePct ?? 0,
                    wasteSetupM: out.slit?.wasteSetupM ?? 0,
                    gcPricePerM2: v,
                  },
                })
              }
            />
          </Hang3>
          <PhuPhiCd
            shippingVnd={out.slit?.shippingVnd}
            packagingVnd={out.slit?.packagingVnd}
            otherVnd={out.slit?.otherVnd}
            onChange={fees => patchOut({ slit: { wastePct: out.slit?.wastePct ?? 0, wasteSetupM: out.slit?.wasteSetupM ?? 0, gcPricePerM2: out.slit?.gcPricePerM2 ?? 0, ...fees } })}
          />
        </div>
      )}

      {steps.includes('laminate') && (
        <div style={{ order: 2, marginBottom: 16 }}>
          <TitleCd label={STEP_LABEL.laminate} />
          {layerKeys.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0 0 8px' }}>
              Chọn lớp 2+ ở cấu trúc để cấu hình ghép GC.
            </p>
          )}
          {layerKeys.map(([key, , label]) => {
            const cfg = out.laminate?.layers?.[key] ?? { filmSource: 'lts' as const };
            return (
              <div key={key} style={{ marginBottom: 12, paddingLeft: 14 }}>
                <HangTitleCoNguon
                  label={label}
                  filmSource={cfg.filmSource}
                  onFilmSource={v =>
                    patchOut({
                      laminate: {
                        layers: {
                          ...out.laminate?.layers,
                          [key]: { ...cfg, filmSource: v },
                        },
                      },
                    })
                  }
                />
                <FieldsTheoNguon
                  cfg={cfg}
                  onChange={next =>
                    patchOut({
                      laminate: {
                        layers: {
                          ...out.laminate?.layers,
                          [key]: next,
                        },
                      },
                    })
                  }
                />
              </div>
            );
          })}
          <PhuPhiCd
            shippingVnd={out.laminate?.shippingVnd}
            packagingVnd={out.laminate?.packagingVnd}
            otherVnd={out.laminate?.otherVnd}
            onChange={fees => patchOut({ laminate: { layers: out.laminate?.layers ?? {}, ...fees } })}
          />
        </div>
      )}

      {steps.includes('print') && (
        <div style={{ order: 1, marginBottom: 16 }}>
          <HangTitleCoNguon
            label={STEP_LABEL.print}
            filmSource={out.print?.filmSource ?? 'lts'}
            onFilmSource={v =>
              patchOut({
                print: { ...(out.print ?? { filmSource: 'lts' }), filmSource: v },
              })
            }
          />
          <FieldsTheoNguon
            cfg={out.print ?? { filmSource: 'lts' }}
            onChange={cfg => patchOut({ print: cfg })}
          />
          <PhuPhiCd
            shippingVnd={out.print?.shippingVnd}
            packagingVnd={out.print?.packagingVnd}
            otherVnd={out.print?.otherVnd}
            onChange={fees => patchOut({ print: { ...(out.print ?? { filmSource: 'lts' }), ...fees } })}
          />
        </div>
      )}

    </div>
  );
}
