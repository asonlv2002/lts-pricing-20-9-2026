import type {
  OutsourceConfig,
  OutsourceStep,
  PricingMode,
  OutsourceLayerConfig,
} from './types';
import type {
  CheDoTinhGia,
  CongDoanGiaCong,
  GiaCongNgoai,
  CauHinhGiaCongLop,
  NguonMangGiaCong,
} from '@lts/kieu-du-lieu';

const STEP_EN_TO_VN: Partial<Record<OutsourceStep, CongDoanGiaCong>> = {
  print: 'in',
  laminate: 'ghep',
  slit: 'chia',
  bag: 'lam_tui',
  handle: 'gan_quai',
  pp_bag: 'bao_pp',
  // 'matte' (lật mặt) — chỉ áp dụng cho engine nâng cao, KHÔNG map sang CongDoanGiaCong.
  // Engine cũ sẽ bỏ qua bước này.
};

export function mapPricingModeEnToVn(mode?: PricingMode): CheDoTinhGia {
  return mode === 'outsource' ? 'gia_cong' : 'noi_bo';
}

function mapFees(x?: { shippingVnd?: number; packagingVnd?: number; otherVnd?: number }) {
  if (!x) return {};
  return {
    vanChuyenVnd: x.shippingVnd,
    dongGoiVnd: x.packagingVnd,
    phuPhiKhacVnd: x.otherVnd,
  };
}

function mapLayer(l?: OutsourceLayerConfig): CauHinhGiaCongLop | undefined {
  if (!l) return undefined;
  const nguonMang: NguonMangGiaCong = l.filmSource === 'vendor' ? 'ben_ngoai' : 'lts';
  return {
    nguonMang,
    tyLePhiHao: l.wastePct,
    phiHaoSetupM: l.wasteSetupM,
    giaGcMoiM2: l.gcPricePerM2,
    giaMuaMangMoiM2: l.filmBuyPricePerM2,
    ...mapFees(l),
  };
}

export function mapOutsourceEnToVn(o?: OutsourceConfig): GiaCongNgoai | undefined {
  if (!o?.steps?.length) return undefined;
  const congDoan = o.steps
    .map(s => STEP_EN_TO_VN[s])
    .filter((cd): cd is CongDoanGiaCong => cd !== undefined);
  if (congDoan.length === 0) return undefined;
  const result: GiaCongNgoai = { congDoan };
  if (o.print) result.in = mapLayer(o.print);
  if (o.laminate?.layers || o.laminate) {
    result.ghep = {
      lop: o.laminate?.layers
        ? {
            lop2: mapLayer(o.laminate.layers.layer2),
            lop3: mapLayer(o.laminate.layers.layer3),
            lop4: mapLayer(o.laminate.layers.layer4),
            lop5: mapLayer(o.laminate.layers.layer5),
          }
        : {},
      ...mapFees(o.laminate),
    };
  }
  if (o.slit) {
    result.chia = {
      tyLePhiHao: o.slit.wastePct,
      phiHaoSetupM: o.slit.wasteSetupM,
      giaGcMoiM2: o.slit.gcPricePerM2,
      ...mapFees(o.slit),
    };
  }
  if (o.bag) {
    result.lamTui = {
      tyLePhiHao: o.bag.wastePct,
      phiHaoSetupM: o.bag.wasteSetupM,
      giaGcMoiTui: o.bag.gcPricePerBag,
      cheDoZipper: o.bag.zipperMode === 'included' ? 'gom' : o.bag.zipperMode === 'excluded' ? 'chua_gom' : undefined,
      giaZipperMoiM: o.bag.zipperPricePerM,
      cheDoBangKeo: o.bag.tapeMode === 'included' ? 'gom' : o.bag.tapeMode === 'excluded' ? 'chua_gom' : undefined,
      giaBangKeoMoiM: o.bag.tapePricePerM,
      ...mapFees(o.bag),
    };
  }
  if (o.handle) {
    result.ganQuai = {
      tyLePhiHao: o.handle.wastePct,
      giaGcMoiTui: o.handle.gcPricePerBag,
      giaQuaiMoiTui: o.handle.handleUnitPrice,
      ...mapFees(o.handle),
    };
  }
  if (o.pp_bag) {
    result.baoPp = {
      bienThe: o.pp_bag.variant,
      tyLePhiHao: o.pp_bag.wastePct,
      phiHaoSetupM: o.pp_bag.wasteSetupM,
      giaGcMoiCai: o.pp_bag.gcPricePerUnit,
      giaVatTuPpMoiCai: o.pp_bag.ppMaterialPricePerUnit,
      ...mapFees(o.pp_bag),
    };
  }
  return result;
}
