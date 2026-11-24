import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { formatoCLP, formatoChilenoFecha } from '../common/utils/tiempo';

type PdfDoc = InstanceType<typeof PDFDocument>;

export interface AvisoPdfData {
  socioNombre: string;
  rut: string;
  direccion: string;
  sector: string;
  periodo: string;
  ordenRuta: number;
  medidorNumero: string;
  lecturaAnterior: number;
  lecturaActual: number;
  consumoM3: number;
  cargoFijoClp: number;
  consumoVariableClp: number;
  subtotalClp: number;
  m3Subsidiados: number;
  porcentajeSubsidio: number;
  descuentoSapClp: number;
  saldoAnteriorClp: number;
  totalAPagarClp: number;
  decretoSap: string | null;
  fechaEmision: Date;
  fechaVencimiento: Date;
  comiteNombre: string;
  comuna: string;
  historial: Array<{ periodo: string; consumoM3: number; totalAPagarClp: number }>;
}

@Injectable()
export class PdfCobrosService {
  async generarIndividual(data: AvisoPdfData): Promise<Buffer> {
    const doc = this.nuevoDocumento();
    doc.addPage({ size: 'LETTER', margin: 0 });
    this.dibujarAviso(doc, data, 36, 36, 540, 690, false);
    return this.finalizar(doc);
  }

  async generarConsolidado(avisos: AvisoPdfData[]): Promise<Buffer> {
    const doc = this.nuevoDocumento();
    const margen = 18;
    const ancho = (612 - margen * 3) / 2;
    const alto = 368;

    if (avisos.length === 0) {
      doc.addPage({ size: 'LETTER', margin: 0 });
      doc.font('Helvetica').fontSize(12).text('No hay cobros para el ciclo seleccionado.', 36, 36);
      return this.finalizar(doc);
    }

    doc.addPage({ size: 'LETTER', margin: 0 });
    avisos.forEach((aviso, index) => {
      if (index % 4 === 0 && index > 0) doc.addPage({ size: 'LETTER', margin: 0 });

      const columna = index % 2;
      const fila = Math.floor(index / 2) % 2;
      const x = margen + columna * (ancho + margen);
      const y = margen + fila * (alto + 8);
      this.dibujarAviso(doc, aviso, x, y, ancho, alto, true);
    });

    return this.finalizar(doc);
  }

  private nuevoDocumento(): PdfDoc {
    const doc = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: false });
    doc.info.Title = 'Avisos de cobro APR';
    doc.info.Author = 'APR SaaS';
    return doc;
  }

  private finalizar(doc: PdfDoc): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  private dibujarAviso(
    doc: PdfDoc,
    data: AvisoPdfData,
    x: number,
    y: number,
    ancho: number,
    alto: number,
    compacto: boolean,
  ): void {
    const pad = compacto ? 7 : 14;
    const titulo = compacto ? 10 : 16;
    const cuerpo = compacto ? 7.2 : 10;
    const small = compacto ? 6.4 : 8.5;
    let cursor = y + pad;

    doc.save();
    doc.rect(x, y, ancho, alto).lineWidth(0.8).strokeColor('#94a3b8').stroke();
    doc.rect(x, y, ancho, compacto ? 22 : 40).fill('#0f172a');

    this.texto(doc, data.comiteNombre.toUpperCase(), x + pad, y + (compacto ? 4 : 8), ancho - pad * 2, titulo, true, '#ffffff');
    if (!compacto) {
      this.texto(
        doc,
        `${data.comuna} · Aviso de cobro · Periodo ${data.periodo}`,
        x + pad,
        y + 27,
        ancho - pad * 2,
        cuerpo,
        false,
        '#e2e8f0',
      );
    }
    cursor = y + (compacto ? 27 : 48);

    this.texto(doc, `Socio: ${data.socioNombre}`, x + pad, cursor, ancho - pad * 2, cuerpo, true);
    cursor += cuerpo + 3;
    this.texto(doc, `RUT: ${data.rut}  ·  Medidor: ${data.medidorNumero} (Orden ruta ${data.ordenRuta})`, x + pad, cursor, ancho - pad * 2, small);
    cursor += small + 2;
    this.texto(doc, `${data.direccion} · ${data.sector}`, x + pad, cursor, ancho - pad * 2, small);
    cursor += small + (compacto ? 5 : 9);

    this.linea(doc, x + pad, cursor, ancho - pad * 2, '#cbd5e1');
    cursor += compacto ? 5 : 8;

    const filas: Array<[string, string]> = [
      ['Lectura anterior / actual (m3)', `${data.lecturaAnterior} / ${data.lecturaActual}`],
      ['Consumo del periodo', `${data.consumoM3} m3`],
      ['Cargo fijo', formatoCLP(data.cargoFijoClp)],
      ['Consumo variable', formatoCLP(data.consumoVariableClp)],
      ['Subtotal', formatoCLP(data.subtotalClp)],
      [
        `Subsidio SAP (${data.porcentajeSubsidio}%, ${data.m3Subsidiados} m3)`,
        `- ${formatoCLP(data.descuentoSapClp)}`,
      ],
      ['Saldo anterior', formatoCLP(data.saldoAnteriorClp)],
    ];

    for (const [etiqueta, valor] of filas) {
      this.texto(doc, etiqueta, x + pad, cursor, (ancho - pad * 2) * 0.62, cuerpo);
      this.texto(doc, valor, x + pad + (ancho - pad * 2) * 0.62, cursor, (ancho - pad * 2) * 0.38, cuerpo, false, '#0f172a', 'right');
      cursor += cuerpo + (compacto ? 1.5 : 4);
    }

    cursor += compacto ? 2 : 5;
    this.linea(doc, x + pad, cursor, ancho - pad * 2, '#0f172a');
    cursor += compacto ? 4 : 8;
    this.texto(doc, 'TOTAL A PAGAR', x + pad, cursor, (ancho - pad * 2) * 0.55, compacto ? 9 : 13, true);
    this.texto(
      doc,
      formatoCLP(data.totalAPagarClp),
      x + pad + (ancho - pad * 2) * 0.5,
      cursor - (compacto ? 0 : 2),
      (ancho - pad * 2) * 0.5,
      compacto ? 10 : 15,
      true,
      '#0f766e',
      'right',
    );
    cursor += (compacto ? 10 : 18) + (compacto ? 3 : 10);

    this.texto(
      doc,
      `Decreto SAP: ${data.decretoSap ?? 'Sin subsidio'}  ·  Emisión: ${formatoChilenoFecha(data.fechaEmision)}  ·  Vence: ${formatoChilenoFecha(data.fechaVencimiento)}`,
      x + pad,
      cursor,
      ancho - pad * 2,
      small,
      false,
      '#475569',
    );
    cursor += small + (compacto ? 4 : 10);

    this.texto(doc, 'ÚLTIMOS 6 MESES', x + pad, cursor, ancho - pad * 2, small, true, '#334155');
    cursor += small + 2;

    const historial = data.historial.slice(0, 6);
    if (historial.length === 0) {
      this.texto(doc, 'Sin historial previo', x + pad, cursor, ancho - pad * 2, small, false, '#64748b');
    } else {
      for (const item of historial) {
        this.texto(doc, item.periodo, x + pad, cursor, (ancho - pad * 2) * 0.35, small);
        this.texto(doc, `${item.consumoM3} m3`, x + pad + (ancho - pad * 2) * 0.35, cursor, (ancho - pad * 2) * 0.25, small);
        this.texto(
          doc,
          formatoCLP(item.totalAPagarClp),
          x + pad + (ancho - pad * 2) * 0.6,
          cursor,
          (ancho - pad * 2) * 0.4,
          small,
          false,
          '#0f172a',
          'right',
        );
        cursor += small + (compacto ? 0.8 : 2.5);
      }
    }

    doc.restore();
  }

  private texto(
    doc: PdfDoc,
    texto: string,
    x: number,
    y: number,
    ancho: number,
    size: number,
    negrita = false,
    color = '#0f172a',
    align: 'left' | 'right' = 'left',
  ): void {
    doc
      .font(negrita ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .fillColor(color)
      .text(texto, x, y, { width: ancho, align, lineBreak: false, ellipsis: true });
  }

  private linea(doc: PdfDoc, x: number, y: number, ancho: number, color: string): void {
    doc.moveTo(x, y).lineTo(x + ancho, y).lineWidth(0.6).strokeColor(color).stroke();
  }
}
