import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = ({ children, showSidebar = false }) => {
    return (
        <div className="min-h-screen w-full">
            <div className="flex w-full">
                {showSidebar && 
                    <div className="hidden lg:block">
                        <Sidebar />
                    </div>
                }

                <div className="flex-1 flex flex-col w-full">
                    <Navbar />

                    <main className="flex-1 overflow-y-auto w-full">{children}</main>
                </div>
            </div>
        </div>
    );
};
export default Layout;
