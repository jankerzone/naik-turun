"use client";

// Definisikan tipe props secara eksplisit
interface MinimalPageProps {
  params: { id: string };
}

// Komponen sederhana yang hanya menampilkan ID
export default function MinimalWebsitePage({ params }: MinimalPageProps) {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold">Test Halaman Sederhana</h1>
      <p className="mt-4">
        Jika Anda melihat ini, berarti proses build untuk halaman dinamis
        berhasil.
      </p>
      <p className="mt-2 font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
        ID Website: {params.id}
      </p>
    </div>
  );
}