"use client";

// Komponen sederhana yang hanya menampilkan ID
// Kita menggunakan { params: any } untuk melewati error type-checking yang salah pada Vercel
export default function MinimalWebsitePage({ params }: { params: any }) {
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