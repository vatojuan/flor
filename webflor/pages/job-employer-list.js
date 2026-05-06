// pages/job-employer-list.js
import { useEffect, useState } from "react";
import Link from "next/link";

export default function JobEmployerList() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    async function fetchEmployerJobs() {
      const res = await fetch("/api/job/employer");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      } else {
        console.error("Error al obtener las ofertas");
      }
    }
    fetchEmployerJobs();
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <h1>Mis Ofertas Publicadas</h1>
      {jobs.length === 0 ? (
        <p>No has publicado ninguna oferta de empleo.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {jobs.map((job) => (
            <li
              key={job.id}
              style={{
                marginBottom: "1rem",
                borderBottom: "1px solid #ccc",
                paddingBottom: "1rem",
              }}
            >
              <h2>{job.title}</h2>
              <p>{job.description}</p>
              <Link href={`/job-offer?id=${job.id}`}>Ver Detalles</Link>
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link href="/dashboard">Volver al Dashboard</Link>
      </p>
    </div>
  );
}
