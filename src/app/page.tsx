import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <section className="py-12 md:py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Organize your tasks with our Kanban Board
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          A simple yet powerful task management tool to help you stay organized and track your progress.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign In
          </Link>
        </div>
      </section>

      <section className="py-12 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Create Multiple Boards</h3>
            <p className="text-gray-600">
              Organize different projects with dedicated kanban boards, each with their own columns and tasks.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Drag & Drop Interface</h3>
            <p className="text-gray-600">
              Easily move tasks between columns with our intuitive drag and drop interface.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Track Progress</h3>
            <p className="text-gray-600">
              Visualize your workflow and track progress as tasks move through different stages.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
