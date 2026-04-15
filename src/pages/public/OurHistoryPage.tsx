import { useEffect } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '@/components/common/SEO';

const NuestraHistoria = () => {
  const { t, i18n } = useTranslation();

  // Actualizar título dinámicamente (buena práctica SEO + UX)
  useEffect(() => {
    document.title = `${t('ourStory.pageTitle')} | Tu Jubilación Descentralizada`;
  }, [t]);

  return (
    <>
      <SEO
        title={t('ourStory.pageTitle')}
        description={t('ourStory.metaDescription')}
        keywords={['jubilación', 'fondo de retiro', 'blockchain', 'decentralized retirement', 'cripto ahorro', 'Arbitrum', 'Cristian Taborda']}
        locale={i18n.language}
      />

      <div className="min-h-screen bg-white">
        {/* Hero de la historia */}
        <section className="bg-gradient-to-br from-gray-900 to-green-900 text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 mb-6">
              <Heart className="text-green-400" size={32} />
              <span className="text-green-400 font-semibold tracking-widest">NUESTRA HISTORIA</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
              Cómo una conversación con mi hijo<br className="hidden md:block" /> cambió el rumbo de todo
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Una tarde cualquiera en las calles de Buenos Aires se convirtió en el origen de esta misión.
            </p>
          </div>
        </section>

        {/* Contenido principal */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto prose prose-lg text-gray-700 leading-relaxed">
            <p>
              Era una tarde común, de esas que parecen iguales a cualquier otra. Yo, <strong>Cristian F. Taborda</strong>, 
              manejaba rumbo al colegio para buscar a mis hijos. Al llegar a la intersección de <strong>Rodríguez Peña y Avenida Rivadavia</strong>, 
              nos encontramos con la manifestación de jubilados que se repite todos los miércoles.
            </p>

            <p>
              Uno de mis hijos, con esa inocencia pura que solo tienen los niños, miró la escena y preguntó:
            </p>

            <blockquote className="border-l-4 border-green-600 pl-6 py-2 italic bg-gray-50 rounded-r-2xl text-gray-600">
              — Papá… ¿por qué están cortando la calle estas personas?
            </blockquote>

            <p>
              Respondí con un nudo en la garganta:
            </p>

            <blockquote className="border-l-4 border-green-600 pl-6 py-2 italic bg-gray-50 rounded-r-2xl text-gray-600">
              — Son jubilados, hijo. Cortan las calles todos los miércoles… hoy me olvidé y pasamos por acá.
            </blockquote>

            <p>
              Mi hijo, aún más confundido, insistió:
            </p>

            <blockquote className="border-l-4 border-green-600 pl-6 py-2 italic bg-gray-50 rounded-r-2xl text-gray-600">
              — ¿Pero no son jubilados? Ya no deberían trabajar… tendrían que estar visitando a sus nietos, descansando y siendo felices. ¿Qué es lo que reclaman?
            </blockquote>

            <p>
              En ese momento sentí que el corazón se me apretaba. Miré a mi hijo y le respondí con la voz cargada de recuerdos dolorosos:
            </p>

            <blockquote className="border-l-4 border-green-600 pl-6 py-2 italic bg-gray-50 rounded-r-2xl text-gray-600">
              — Reclaman porque el Estado les quitó los aportes de toda una vida de trabajo y ahora les paga una miseria. 
              A mi abuela le pasó lo mismo… por eso mi mamá y mi tía tenían que ayudarla todos los meses para llegar a fin de mes. 
              Después les tocó a tus abuelos, y tu tío y yo tuvimos que hacer lo mismo.
            </blockquote>

            <p>
              Ese instante se quedó grabado en mi alma para siempre. Ver la dura realidad a través de los ojos de mi hijo me hizo comprender con una claridad dolorosa 
              que <strong>no podía permitir que esta historia se repitiera</strong> con mi familia… ni con ninguna otra.
            </p>

            <div className="my-12 bg-green-50 border border-green-100 p-10 rounded-3xl">
              <p className="font-semibold text-gray-900 text-xl leading-relaxed text-center">
                Como programador y emprendedor, sentí un profundo llamado a actuar.<br />
                No quería que las futuras generaciones tuvieran que depender del Estado ni suplicar por una jubilación digna.<br />
                Tampoco quería que tuvieran que cargar con el peso económico de sus padres o abuelos.
              </p>
            </div>

            <p>
              De esa tarde, de esa conversación llena de amor, frustración y esperanza, nació la idea de crear una 
              <strong>aplicación descentralizada</strong> donde cada persona pueda calcular, crear y administrar 
              su propio fondo de retiro de forma autónoma, transparente y segura.
            </p>

            <p className="font-semibold text-gray-900 text-lg pt-6 border-t border-gray-200">
              Porque nadie debería tener que cortar una calle para reclamar lo que le corresponde por derecho.<br />
              Y porque ningún hijo debería ver sufrir a sus abuelos… ni tener que sostenerlos económicamente cuando llegue su turno.
            </p>
          </div>
        </section>

        {/* Call to Action final */}
        <section className="bg-gray-50 py-16 px-4 border-t border-gray-100">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              ¿Listo para tomar el control de tu futuro?
            </h3>
            <p className="text-gray-600 mb-8">
              Construí tu propio fondo de retiro de forma descentralizada y sin intermediarios.
            </p>
            <Link
              to="/calculator"
              className="inline-flex items-center gap-3 bg-green-700 hover:bg-green-800 text-white px-10 py-4 rounded-2xl font-semibold text-lg transition-all shadow-lg"
            >
              Empezar ahora
              <ArrowLeft className="rotate-180" size={22} />
            </Link>
          </div>
        </section>

        {/* Botón volver */}
        <div className="flex justify-center pb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al inicio
          </Link>
        </div>
      </div>
    </>
  );
};

export default NuestraHistoria;