"use client";

import { AnimatePresence, motion, type Transition } from "framer-motion";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

interface MorphingUserPillProps {
  email: string;
  initial: string;
}

const spring: Transition = {
  type: "spring",
  stiffness: 470,
  damping: 38,
  mass: 0.82,
};

const fadeT = {
  duration: 0.17,
  ease: [0.22, 1, 0.36, 1] as const,
};

function Avatar({ initial }: { initial: string }) {
  return (
    <motion.div
      layoutId="user-avatar"
      transition={spring}
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #4D6BFE 0%, #7B92FF 100%)",
        display: "grid",
        placeItems: "center",
        fontWeight: 600,
        fontSize: 13,
        color: "#fff",
        flex: "0 0 auto",
        userSelect: "none",
      }}
    >
      {initial}
    </motion.div>
  );
}

export default function MorphingUserPill({
  email,
  initial,
}: MorphingUserPillProps) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  async function handleSignOut(e: React.MouseEvent) {
    e.stopPropagation();
    await signOut({ redirect: false });
    router.push("/login");
  }

  function handleCollapse(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded(false);
  }

  return (
    <motion.div
      layout
      transition={spring}
      onClick={() => !expanded && setExpanded(true)}
      style={{
        width: expanded ? "100%" : 48,
        height: 48,
        borderRadius: 999,
        background: "#0A0A0A",
        position: "relative",
        overflow: "hidden",
        cursor: expanded ? "default" : "pointer",
        boxShadow:
          "0 6px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)",
        marginLeft: 0,
        transition: "margin 0ms",
      }}
    >
      <AnimatePresence mode="sync" initial={false}>
        {!expanded ? (
          <motion.div
            key="compact"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={fadeT}
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Avatar initial={initial} />
          </motion.div>
        ) : (
          <motion.div
            key="profile"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={fadeT}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingLeft: 7,
              paddingRight: 6,
            }}
          >
            <Avatar initial={initial} />

            <div style={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={email}
              >
                {email}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.5)",
                  marginTop: 2,
                }}
              >
                Signed in
              </div>
            </div>

            <motion.button
              type="button"
              onClick={handleSignOut}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              aria-label="Sign out"
              title="Sign out"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: 0,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                cursor: "pointer",
                flex: "0 0 auto",
              }}
            >
              <LogOut size={15} />
            </motion.button>

            <motion.button
              type="button"
              onClick={handleCollapse}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              aria-label="Collapse"
              title="Collapse"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: 0,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                cursor: "pointer",
                flex: "0 0 auto",
                fontSize: 18,
                lineHeight: 1,
                paddingBottom: 2,
              }}
            >
              ×
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}