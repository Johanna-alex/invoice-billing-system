import { Link } from "react-router-dom";

function NotFoundPage() {
  return <div className="not-found"><span>404</span><h1>Page not found</h1><p>The page you requested does not exist or may have moved.</p><Link className="button primary" to="/dashboard">Return to dashboard</Link></div>;
}

export default NotFoundPage;
