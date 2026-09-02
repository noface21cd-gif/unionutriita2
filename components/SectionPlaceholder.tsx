"use client";

import Link from "next/link";

type Props = {
  icono: string;
  etiqueta: string;
  titulo: string;
  descripcion: string;
};

export default function SectionPlaceholder({
  icono,
  etiqueta,
  titulo,
  descripcion,
}: Props) {
  return (
    <main className="profilePage">
      <section className="profileCard">
        <div className="authOtter">{icono}</div>

        <p className="profileEyebrow">
          {etiqueta}
        </p>

        <h1>{titulo}</h1>

        <p className="authDescription">
          {descripcion}
        </p>

        <div className="emptyState">
          <span className="emptyStateIcon">
            🦦
          </span>

          Esta sección ya está conectada a la
          navegación y la construiremos en la
          siguiente etapa.
        </div>

        <Link
          href="/"
          className="backHomeButton"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
