"use client";

import { Printer } from "lucide-react";
import Modal from "./Modal";
import { esc, imprimirHTML, type ItemMov, type Operacion } from "../lib/api";
import type { DeviceInfo } from "../lib/device";

export interface ReceiptData {
  fechaHora: string;
  usuario: string;
  legajo: string;
  operacion: Operacion;
  uso: string;
  items: ItemMov[];
  device: DeviceInfo;
}

export default function ReceiptModal({ data, onClose }: { data: ReceiptData | null; onClose: () => void }) {
  if (!data) return null;
  const op = data.operacion === "retiro" ? "RETIRO" : "DEVOLUCIÓN";

  const imprimir = () => {
    const filas = data.items
      .map((i) => `<tr><td>${esc(i.material)}</td><td style="text-align:center">${i.cantidad}</td><td>${esc(i.unidad || "u.")}</td></tr>`)
      .join("");
    imprimirHTML(`<!doctype html><html><head><meta charset="utf-8"><title>Comprobante ENERSA</title>
    <style>body{font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:16px;color:#111}
    h3{text-align:center;border-bottom:1px dashed #999;padding-bottom:10px}p{display:flex;justify-content:space-between;gap:12px;margin:4px 0;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th,td{border-bottom:1px solid #ccc;padding:5px;text-align:left}
    .f{text-align:center;margin-top:18px;font-size:11px;color:#555;border-top:1px dashed #999;padding-top:10px}.d{font-family:monospace;font-size:10px;color:#555}</style></head>
    <body><h3>ENERSA · Comprobante de ${op}</h3>
    <p><span>Fecha:</span><b>${esc(data.fechaHora)}</b></p>
    <p><span>Usuario:</span><b>${esc(data.usuario)}</b></p>
    <p><span>Legajo:</span><b>${esc(data.legajo)}</b></p>
    <p><span>Operación:</span><b>${op}</b></p>
    <p><span>Uso:</span><b>${esc(data.uso)}</b></p>
    <table><thead><tr><th>Material</th><th style="text-align:center">Cant.</th><th>Unidad</th></tr></thead><tbody>${filas}</tbody></table>
    <div class="f"><p class="d" style="display:block">Dispositivo: ${esc(data.device.descripcion)}<br>ID ${esc(data.device.id)} · Huella ${esc(data.device.huella)}${data.device.ip ? " · IP " + esc(data.device.ip) : ""}</p>
    <p style="display:block;margin-top:20px">Firma del responsable: ____________________</p><p style="display:block">Comprobante generado automáticamente</p></div>
    <script>window.onload=function(){window.print();}</script></body></html>`);
  };

  const Row = ({ k, v }: { k: string; v: string }) => (
    <p className="mb-1.5 flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{k}</span>
      <strong className="text-right">{v}</strong>
    </p>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Comprobante"
      maxWidth="max-w-lg"
      footer={
        <button className="btn btn-primary" onClick={imprimir}>
          <Printer size={16} /> Imprimir Ticket
        </button>
      }
    >
      <div className="bg-slate-50 p-2 sm:p-0">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 border-b border-dashed border-slate-300 pb-3 text-center font-semibold">ENERSA · {op}</h3>
          <Row k="Fecha:" v={data.fechaHora} />
          <Row k="Usuario:" v={data.usuario} />
          <Row k="Legajo:" v={data.legajo} />
          <Row k="Operación:" v={op} />
          <Row k="Uso:" v={data.uso} />
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="p-2">Material</th>
                <th className="p-2 text-center">Cant.</th>
                <th className="p-2">Unidad</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="p-2">{i.material}</td>
                  <td className="p-2 text-center">{i.cantidad}</td>
                  <td className="p-2">{i.unidad || "u."}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 border-t border-dashed border-slate-300 pt-3 text-center text-xs text-slate-500">
            <p className="font-mono text-[10px] leading-relaxed">
              {data.device.descripcion}
              <br />
              ID {data.device.id} · Huella {data.device.huella}
              {data.device.ip && ` · IP ${data.device.ip}`}
            </p>
            <p className="mt-3">Firma del responsable: ____________________</p>
            <p>Comprobante generado automáticamente</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
