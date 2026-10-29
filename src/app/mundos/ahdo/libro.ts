import { Component, computed, signal } from '@angular/core';
import { ABONOS_DEMO, FACTURA_DEMO_TOTAL, type AbonoDemo } from './datos';

/** Formato fijo (sin Intl) para que el servidor y el navegador escriban lo mismo. */
const pesos = (n: number): string => `$${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** El libro de pagos de una factura de muestra: los abonos se anulan, no se borran, y el saldo se deriva. */
@Component({
  selector: 'app-ahdo-libro',
  templateUrl: './libro.html',
  styleUrl: './libro.scss',
})
export class AhdoLibro {
  protected readonly abonos = ABONOS_DEMO;
  protected readonly total = pesos(FACTURA_DEMO_TOTAL);
  protected readonly anulados = signal<ReadonlySet<string>>(new Set());

  protected readonly pagado = computed(() =>
    ABONOS_DEMO.filter((a) => !this.anulados().has(a.id)).reduce((suma, a) => suma + a.valor, 0),
  );
  /** El saldo nunca se guarda: se deriva del libro, igual que en la plataforma. */
  protected readonly saldo = computed(() => Math.max(0, FACTURA_DEMO_TOTAL - this.pagado()));
  protected readonly estado = computed(() =>
    this.saldo() === 0 ? 'Pagada' : this.pagado() > 0 ? 'Pago parcial' : 'Pendiente',
  );
  protected readonly avance = computed(() => this.pagado() / FACTURA_DEMO_TOTAL);
  protected readonly formatear = pesos;

  protected anulado(a: AbonoDemo): boolean {
    return this.anulados().has(a.id);
  }

  protected alternar(a: AbonoDemo): void {
    this.anulados.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(a.id)) nuevo.delete(a.id);
      else nuevo.add(a.id);
      return nuevo;
    });
  }
}
